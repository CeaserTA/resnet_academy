<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * A pending application is its own record, never an `Enrolment` row — that only gets created by
 * `approve()`, which delegates to the existing `EnrolmentService::enrol()` completely unchanged.
 * This keeps every existing `EnrolmentStatus::Confirmed` access-gate check correct for free.
 */
final class CourseApplicationService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EnrolmentService $enrolmentService,
    ) {}

    /**
     * @param  array<int, string>  $answers
     */
    public function apply(User $student, Course $course, array $answers, ?string $portfolioUrl, ?string $alternativeProofText): CourseApplication
    {
        if ($course->enrolment_policy !== CourseEnrolmentPolicy::Application) {
            throw ValidationException::withMessages(['course_id' => 'This course does not require an application.']);
        }

        if ($course->enrolments()->where('student_id', $student->id)->where('status', EnrolmentStatus::Confirmed)->exists()) {
            throw ValidationException::withMessages(['course_id' => 'You are already enrolled in this course.']);
        }

        if ($course->applications()->where('student_id', $student->id)->where('status', CourseApplicationStatus::Pending)->exists()) {
            throw ValidationException::withMessages(['course_id' => 'You already have a pending application for this course.']);
        }

        $application = CourseApplication::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
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
            meta: ['course_id' => $course->id],
        );

        return $application;
    }

    public function approve(CourseApplication $application, User $admin): CourseApplication
    {
        $application->update([
            'status' => CourseApplicationStatus::Approved,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Carbon::now(),
        ]);

        $this->enrolmentService->enrol($application->student, $application->course, EnrolmentSource::Self);

        $this->auditLogger->log(
            action: 'course_application.approved',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $admin->id,
            meta: ['course_id' => $application->course_id, 'student_id' => $application->student_id],
        );

        $this->notificationDispatcher->notify(
            user: $application->student,
            type: 'application_approved',
            title: "Your application to {$application->course->title} was approved",
            body: 'You are now enrolled — check your courses to get started.',
            relatedEntityType: 'course_application',
            relatedEntityId: $application->id,
        );

        return $application->fresh();
    }

    /**
     * @param  array<int, int>  $recommendedCourseIds
     */
    public function reject(CourseApplication $application, User $admin, array $recommendedCourseIds = []): CourseApplication
    {
        $application->update([
            'status' => CourseApplicationStatus::Rejected,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Carbon::now(),
            'recommended_course_ids' => $recommendedCourseIds !== [] ? $recommendedCourseIds : null,
        ]);

        $this->auditLogger->log(
            action: 'course_application.rejected',
            entityType: 'course_application',
            entityId: $application->id,
            actorId: $admin->id,
            meta: ['course_id' => $application->course_id, 'student_id' => $application->student_id],
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
}
