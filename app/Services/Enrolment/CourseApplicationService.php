<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A pending application is its own record, never an `Enrolment` row — that only gets created by
 * `approve()`, which delegates to the existing `EnrolmentService::enrol()` completely unchanged.
 * This keeps every existing `EnrolmentStatus::Confirmed` access-gate check correct for free.
 */
final class CourseApplicationService
{
    /**
     * A rejected application stays on the student's dashboard for this many days after the
     * decision, mirroring `AnalyticsService::AT_RISK_INACTIVITY_DAYS`'s constant-on-the-service
     * pattern.
     */
    private const REJECTION_VISIBILITY_DAYS = 14;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EnrolmentService $enrolmentService,
    ) {}

    /**
     * @param  array<int, bool>  $answers
     */
    public function apply(User $student, Course $course, array $answers, ?string $portfolioUrl, ?string $alternativeProofText, int $cohortCourseId): CourseApplication
    {
        if ($course->enrolment_policy !== CourseEnrolmentPolicy::Application) {
            throw ValidationException::withMessages(['course_id' => 'This course does not require an application.']);
        }

        // Check for existing confirmed enrollment in this specific cohort offering
        $existingEnrolment = $course->enrolments()
            ->where('student_id', $student->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->where('cohort_course_id', $cohortCourseId)
            ->exists();

        if ($existingEnrolment) {
            throw ValidationException::withMessages(['course_id' => 'You are already enrolled in this course/cohort.']);
        }

        // Check for existing pending application for this specific (course, cohort offering)
        // combination — allow multiple pending applications across different cohort offerings.
        $existingApplication = $course->applications()
            ->where('student_id', $student->id)
            ->where('status', CourseApplicationStatus::Pending)
            ->where('cohort_course_id', $cohortCourseId)
            ->exists();

        if ($existingApplication) {
            throw ValidationException::withMessages(['course_id' => 'You already have a pending application for this course/cohort.']);
        }

        return DB::transaction(function () use ($student, $course, $answers, $portfolioUrl, $alternativeProofText, $cohortCourseId): CourseApplication {
            [$score, $passed] = $this->gradeEligibility($course, $answers);

            $application = CourseApplication::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $cohortCourseId,
                'status' => CourseApplicationStatus::Pending,
                'answers' => $answers,
                'eligibility_score' => $score,
                'eligibility_passed' => $passed,
                'portfolio_url' => $portfolioUrl,
                'alternative_proof_text' => $alternativeProofText,
            ]);

            $this->auditLogger->log(
                action: 'course_application.submitted',
                entityType: 'course_application',
                entityId: $application->id,
                actorId: $student->id,
                meta: [
                    'course_id' => $course->id,
                    'cohort_course_id' => $cohortCourseId,
                    'eligibility_score' => $score,
                    'eligibility_passed' => $passed,
                ],
            );

            // A passing score clears the applicant automatically — no reviewer needed. Anything
            // else (including a course with no eligibility questions to grade at all) falls back
            // to the existing manual review queue untouched.
            if ($passed) {
                return $this->decide($application, reviewer: null);
            }

            return $application;
        });
    }

    /**
     * Grades an applicant's Yes/No answers against each question's admin-defined correct
     * answer and checks the result against the course's pass threshold (default 100%, i.e.
     * every question must be answered correctly, when the course doesn't set one).
     *
     * A course with no eligibility questions defined has nothing to grade — it always falls
     * back to manual review rather than auto-passing on a vacuous 0-of-0 score.
     *
     * @param  array<int, bool>  $answers
     * @return array{0: int|null, 1: bool} [score as a 0-100 percentage or null, passed]
     */
    private function gradeEligibility(Course $course, array $answers): array
    {
        $questions = $course->application_questions ?? [];

        if ($questions === []) {
            return [null, false];
        }

        $correctCount = 0;
        foreach ($questions as $index => $question) {
            if (($answers[$index] ?? null) === (bool) ($question['correct_answer'] ?? false)) {
                $correctCount++;
            }
        }

        $score = (int) round($correctCount / count($questions) * 100);
        $threshold = $course->application_pass_threshold ?? 100;

        return [$score, $score >= $threshold];
    }

    /**
     * $reviewer is an admin, or an instructor teaching the course (enforced by
     * `CourseApplicationPolicy`) — whichever acts first on a pending application wins.
     *
     * The whole decision runs in one transaction: the application row is re-fetched under a
     * row lock (so two reviewers acting concurrently can't both decide it), and
     * `EnrolmentService::enrol()` runs inside the same transaction — any enrolment failure
     * rolls the application back to pending instead of leaving it "approved" with no seat.
     *
     * The enrolment outcome decides the messaging: a confirmed seat sends the enrolled
     * notification and auto-cancels sibling applications, while a waitlisted seat sends a
     * dedicated waitlist notification and leaves sibling applications untouched — the
     * student holds no seat yet, so their other options stay alive.
     */
    public function approve(int $applicationId, User $reviewer): CourseApplication
    {
        return DB::transaction(function () use ($applicationId, $reviewer): CourseApplication {
            $application = CourseApplication::where('id', $applicationId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($application->status !== CourseApplicationStatus::Pending) {
                throw ValidationException::withMessages(['status' => 'This application has already been decided.']);
            }

            return $this->decide($application, $reviewer);
        });
    }

    /**
     * Shared approval path for both a human reviewer's decision (`$reviewer` set) and the
     * system's automatic approval when eligibility answers clear the course's pass threshold
     * (`$reviewer` null) — everything past "who decided this" (enrolling the student,
     * notifying them, auto-cancelling sibling applications) is identical either way.
     *
     * Called from inside `apply()`'s and `approve()`'s own transactions — never opens one of
     * its own.
     */
    private function decide(CourseApplication $application, ?User $reviewer): CourseApplication
    {
        $application->update([
            'status' => CourseApplicationStatus::Approved,
            'reviewed_by' => $reviewer?->id,
            'reviewed_at' => Carbon::now(),
            'approved_automatically' => $reviewer === null,
        ]);

        // Enroll the student (may be confirmed or waitlisted depending on cohort capacity)
        $enrolment = $this->enrolmentService->enrol(
            $application->student,
            $application->course,
            EnrolmentSource::Self,
            $application->cohort_course_id
        );

        $this->auditLogger->log(
            action: 'course_application.approved',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $reviewer?->id,
            meta: [
                'course_id' => $application->course_id,
                'cohort_course_id' => $application->cohort_course_id,
                'student_id' => $application->student_id,
                'decided_by_role' => $reviewer?->role->value ?? 'system',
                'enrolment_status' => $enrolment->status->value,
            ],
        );

        if ($enrolment->status === EnrolmentStatus::Waitlisted) {
            $this->notificationDispatcher->notify(
                user: $application->student,
                type: 'application_waitlisted',
                title: "Your application to {$application->course->title} was approved — you're on the waitlist",
                body: 'This cohort is currently full, so you hold a waitlisted spot. We will notify you as soon as a seat opens up.',
                relatedEntityType: 'course_application',
                relatedEntityId: $application->id,
            );

            return $this->withEnrolmentStatus($application->fresh(), $enrolment);
        }

        $this->notificationDispatcher->notify(
            user: $application->student,
            type: 'application_approved',
            title: "Your application to {$application->course->title} was approved",
            body: 'You are now enrolled — check your courses to get started.',
            relatedEntityType: 'course_application',
            relatedEntityId: $application->id,
        );

        // Auto-cancel other pending applications for the same course — only once the
        // student actually holds a confirmed seat.
        $this->autoCancelOtherApplications($application);

        return $this->withEnrolmentStatus($application->fresh(), $enrolment);
    }

    /**
     * Stamps the resulting enrolment's status onto the (already-approved) application as a
     * transient, non-persisted attribute — CourseApplicationResource reads it so the caller of
     * apply()/approve() can tell a confirmed seat from a waitlisted one immediately, without a
     * second request. Never written to the database and never present on an application
     * fetched any other way.
     */
    private function withEnrolmentStatus(CourseApplication $application, Enrolment $enrolment): CourseApplication
    {
        $application->setAttribute('enrolment_status', $enrolment->status->value);

        return $application;
    }

    /**
     * Auto-cancel other pending applications for the same course after approval.
     * A student should not hold an enrollment in one cohort offering while pending on another.
     */
    private function autoCancelOtherApplications(CourseApplication $approvedApplication): void
    {
        $otherPendingApplications = CourseApplication::query()
            ->where('student_id', $approvedApplication->student_id)
            ->where('course_id', $approvedApplication->course_id)
            ->where('id', '!=', $approvedApplication->id)
            ->where('status', CourseApplicationStatus::Pending)
            ->get();

        foreach ($otherPendingApplications as $application) {
            $application->update([
                'status' => CourseApplicationStatus::Rejected,
                'reviewed_by' => $approvedApplication->reviewed_by,
                'reviewed_at' => Carbon::now(),
                'rejection_reason' => 'Auto-cancelled because you were enrolled in another cohort offering of this course.',
            ]);

            $this->auditLogger->log(
                action: 'course_application.auto_cancelled_on_enrollment',
                entityType: 'course_application',
                entityId: $application->id,
                actorId: $approvedApplication->student_id,
                meta: [
                    'course_id' => $application->course_id,
                    'cohort_course_id' => $application->cohort_course_id,
                    'approved_application_id' => $approvedApplication->id,
                    'approved_cohort_course_id' => $approvedApplication->cohort_course_id,
                ],
            );
        }
    }

    /**
     * @param  array<int, int>  $recommendedCourseIds
     */
    public function reject(CourseApplication $application, User $reviewer, array $recommendedCourseIds = [], ?string $rejectionReason = null): CourseApplication
    {
        if ($application->status !== CourseApplicationStatus::Pending) {
            throw ValidationException::withMessages(['status' => 'This application has already been decided.']);
        }

        return DB::transaction(function () use ($application, $reviewer, $recommendedCourseIds, $rejectionReason): CourseApplication {
            $application->update([
                'status' => CourseApplicationStatus::Rejected,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => Carbon::now(),
                'recommended_course_ids' => $recommendedCourseIds !== [] ? $recommendedCourseIds : null,
                'rejection_reason' => $rejectionReason,
            ]);

            $this->auditLogger->log(
                action: 'course_application.rejected',
                entityType: 'course_application',
                entityId: $application->id,
                actorId: $reviewer->id,
                meta: [
                    'course_id' => $application->course_id,
                    'student_id' => $application->student_id,
                    'decided_by_role' => $reviewer->role->value,
                ],
            );

            $this->notificationDispatcher->notify(
                user: $application->student,
                type: 'application_rejected',
                title: "Your application to {$application->course->title} was not accepted",
                body: $recommendedCourseIds !== []
                    ? 'Take a look at the recommended courses on your dashboard to build up to this one.'
                    : null,
                relatedEntityType: 'course_application',
                relatedEntityId: $application->id,
            );

            return $application->fresh();
        });
    }

    /**
     * Drives the "Applications" section of the student dashboard: every pending application, plus
     * rejected ones that haven't been dismissed, haven't expired, and whose recommended course(s)
     * the student hasn't already acted on. Nothing is ever deleted — this only narrows what the
     * dashboard query returns; the full history stays queryable elsewhere.
     *
     * @return Collection<int, CourseApplication>
     */
    public function visibleForDashboard(User $student): Collection
    {
        $applications = CourseApplication::query()
            ->where('student_id', $student->id)
            ->where(function ($query): void {
                $query->where('status', CourseApplicationStatus::Pending)
                    ->orWhere(function ($query): void {
                        $query->where('status', CourseApplicationStatus::Rejected)
                            ->whereNull('dismissed_at')
                            ->where('reviewed_at', '>=', Carbon::now()->subDays(self::REJECTION_VISIBILITY_DAYS));
                    });
            })
            ->with(['course.category', 'course.instructors', 'reviewer', 'cohortCourse.cohort'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Same N+1 guard as the admin review queue: one query for every recommended course.
        CourseApplication::loadRecommendedCourses($applications);

        $recommendedCourseIds = $applications
            ->flatMap(fn (CourseApplication $application): array => $application->recommended_course_ids ?? [])
            ->unique();

        $startedCourseIds = Enrolment::query()
            ->where('student_id', $student->id)
            ->whereIn('course_id', $recommendedCourseIds)
            ->pluck('course_id');

        return $applications->reject(
            fn (CourseApplication $application): bool => $application->status === CourseApplicationStatus::Rejected
                && collect($application->recommended_course_ids ?? [])->intersect($startedCourseIds)->isNotEmpty(),
        )->values();
    }

    public function dismiss(CourseApplication $application, User $student): CourseApplication
    {
        DB::transaction(function () use ($application, $student): void {
            $application->update(['dismissed_at' => Carbon::now()]);

            $this->auditLogger->log(
                action: 'course_application.dismissed',
                entityType: 'course_application',
                entityId: $application->id,
                actorId: $student->id,
                meta: ['course_id' => $application->course_id],
            );
        });

        return $application->fresh();
    }
}
