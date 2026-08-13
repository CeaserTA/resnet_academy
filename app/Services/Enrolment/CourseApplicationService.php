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
     * @param  array<int, string>  $answers
     */
    public function apply(User $student, Course $course, array $answers, ?string $portfolioUrl, ?string $alternativeProofText, ?int $sectionId = null): CourseApplication
    {
        if ($course->enrolment_policy !== CourseEnrolmentPolicy::Application) {
            throw ValidationException::withMessages(['course_id' => 'This course does not require an application.']);
        }

        // Check for existing confirmed enrollment (section-aware)
        $existingEnrolmentQuery = $course->enrolments()
            ->where('student_id', $student->id)
            ->where('status', EnrolmentStatus::Confirmed);

        if ($sectionId !== null) {
            $existingEnrolmentQuery->where('section_id', $sectionId);
        } else {
            $existingEnrolmentQuery->whereNull('section_id');
        }

        if ($existingEnrolmentQuery->exists()) {
            throw ValidationException::withMessages(['course_id' => 'You are already enrolled in this course/section.']);
        }

        // Check for existing pending application for this specific (course, section) combination
        // Allow multiple pending applications across different sections
        $existingApplicationQuery = $course->applications()
            ->where('student_id', $student->id)
            ->where('status', CourseApplicationStatus::Pending);

        if ($sectionId !== null) {
            $existingApplicationQuery->where('section_id', $sectionId);
        } else {
            $existingApplicationQuery->whereNull('section_id');
        }

        if ($existingApplicationQuery->exists()) {
            throw ValidationException::withMessages(['course_id' => 'You already have a pending application for this course/section.']);
        }

        $application = CourseApplication::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $sectionId,
            'status' => CourseApplicationStatus::Pending,
            'answers' => $answers,
            'portfolio_url' => $portfolioUrl,
            'alternative_proof_text' => $alternativeProofText,
        ]);

        $this->auditLogger->log(
            action: 'course_application.submitted',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $student->id,
            meta: ['course_id' => $course->id, 'section_id' => $sectionId],
        );

        return $application;
    }

    /**
     * $reviewer is an admin, or an instructor teaching the course (enforced by
     * `CourseApplicationPolicy`) — whichever acts first on a pending application wins.
     * 
     * After successful enrollment, auto-cancel any other pending applications for the same course_id.
     */
    public function approve(CourseApplication $application, User $reviewer): CourseApplication
    {
        if ($application->status !== CourseApplicationStatus::Pending) {
            throw ValidationException::withMessages(['status' => 'This application has already been decided.']);
        }

        $application->update([
            'status' => CourseApplicationStatus::Approved,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => Carbon::now(),
        ]);

        // Enroll the student (may be confirmed or waitlisted depending on section capacity)
        $this->enrolmentService->enrol(
            $application->student,
            $application->course,
            EnrolmentSource::Self,
            $application->section_id
        );

        $this->auditLogger->log(
            action: 'course_application.approved',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $reviewer->id,
            meta: [
                'course_id' => $application->course_id,
                'section_id' => $application->section_id,
                'student_id' => $application->student_id,
                'decided_by_role' => $reviewer->role->value,
            ],
        );

        $this->notificationDispatcher->notify(
            user: $application->student,
            type: 'application_approved',
            title: "Your application to {$application->course->title} was approved",
            body: 'You are now enrolled — check your courses to get started.',
            relatedEntityType: 'course_application',
            relatedEntityId: $application->id,
        );

        // Auto-cancel other pending applications for the same course
        $this->autoCancelOtherApplications($application);

        return $application->fresh();
    }

    /**
     * Auto-cancel other pending applications for the same course after approval.
     * A student should not hold an enrollment in one section while pending on another.
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
                'rejection_reason' => 'Auto-cancelled because you were enrolled in another section of this course.',
            ]);

            $this->auditLogger->log(
                action: 'course_application.auto_cancelled_on_enrollment',
                entityType: 'course_application',
                entityId: $application->id,
                actorId: $approvedApplication->student_id,
                meta: [
                    'course_id' => $application->course_id,
                    'section_id' => $application->section_id,
                    'approved_application_id' => $approvedApplication->id,
                    'approved_section_id' => $approvedApplication->section_id,
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
            ->with(['course.category', 'course.instructors', 'reviewer', 'section'])
            ->orderBy('created_at', 'desc')
            ->get();

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
        $application->update(['dismissed_at' => Carbon::now()]);

        $this->auditLogger->log(
            action: 'course_application.dismissed',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $student->id,
            meta: ['course_id' => $application->course_id],
        );

        return $application->fresh();
    }
}
