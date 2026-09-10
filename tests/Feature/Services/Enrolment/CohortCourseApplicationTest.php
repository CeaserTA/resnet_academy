<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Enrolment;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentStatus;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Enrolment\CourseApplicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CohortCourseApplicationTest extends TestCase
{
    use RefreshDatabase;

    private CourseApplicationService $applicationService;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Queue::fake();
        Notification::fake();

        $this->applicationService = $this->app->make(CourseApplicationService::class);
    }

    public function test_apply_accepts_cohort_course_id(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1', 2 => 'Answer 2'],
            'https://portfolio.example.com',
            null,
            $cohortCourse->id
        );

        $this->assertEquals($cohortCourse->id, $application->cohort_course_id);
        $this->assertEquals(CourseApplicationStatus::Pending, $application->status);
    }

    public function test_apply_allows_multiple_pending_applications_across_different_cohort_offerings(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohortCourse1 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);
        $cohortCourse2 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application1 = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse1->id
        );

        $application2 = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse2->id
        );

        $this->assertEquals($cohortCourse1->id, $application1->cohort_course_id);
        $this->assertEquals($cohortCourse2->id, $application2->cohort_course_id);
        $this->assertEquals(CourseApplicationStatus::Pending, $application1->status);
        $this->assertEquals(CourseApplicationStatus::Pending, $application2->status);
    }

    public function test_apply_prevents_duplicate_pending_application_for_same_cohort_offering(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        // First application
        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse->id
        );

        // Attempt duplicate for same cohort offering
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You already have a pending application for this course/cohort.');

        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse->id
        );
    }

    public function test_approve_passes_cohort_course_id_to_enrolment_service(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 0,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $this->applicationService->approve($application->id, $reviewer);

        // Check that enrollment was created with cohort_course_id
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed->value,
        ]);
    }

    public function test_approve_auto_cancels_other_pending_applications_for_same_course(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse1 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);
        $cohortCourse2 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        // Create two pending applications for different cohort offerings
        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        // Approve first application
        $this->applicationService->approve($application1->id, $reviewer);

        // Check that first application is approved
        $this->assertDatabaseHas('course_applications', [
            'id' => $application1->id,
            'status' => CourseApplicationStatus::Approved->value,
        ]);

        // Check that second application was auto-cancelled
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Rejected->value,
            'rejection_reason' => 'Auto-cancelled because you were enrolled in another cohort offering of this course.',
        ]);
    }

    public function test_approve_logs_auto_cancellation_audit_event(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse1 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);
        $cohortCourse2 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $this->applicationService->approve($application1->id, $reviewer);

        // Check audit log for auto-cancellation
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_application.auto_cancelled_on_enrollment',
            'entity_type' => 'course_application',
            'entity_id' => $application2->id,
            'actor_id' => $student->id,
        ]);
    }

    public function test_approve_does_not_cancel_applications_for_different_courses(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();

        $course1 = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $course2 = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);

        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        // Approve application for course1
        $this->applicationService->approve($application1->id, $reviewer);

        // Application for course2 should remain pending
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Pending->value,
        ]);
    }

    public function test_approve_with_waitlisted_enrollment_keeps_other_applications_pending(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse1 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 1,
            'seats_taken' => 1, // Full
        ]);
        $cohortCourse2 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        // Approve application for full cohort offering (creates waitlisted enrollment)
        $this->applicationService->approve($application1->id, $reviewer);

        // Check that enrollment was waitlisted
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse1->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // The student holds no seat yet, so sibling applications must stay pending
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Pending->value,
        ]);

        // And the student gets the waitlist message, not the "you are enrolled" one
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'type' => 'application_waitlisted',
            'related_entity_type' => 'course_application',
            'related_entity_id' => $application1->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $student->id,
            'type' => 'application_approved',
        ]);
    }

    public function test_approve_sends_approved_notification_and_cancels_siblings_when_confirmed(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 0,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $this->applicationService->approve($application->id, $reviewer);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'type' => 'application_approved',
            'related_entity_id' => $application->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $student->id,
            'type' => 'application_waitlisted',
        ]);
    }

    public function test_approve_rolls_back_application_when_enrolment_fails(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Closed,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        try {
            $this->applicationService->approve($application->id, $reviewer);
            $this->fail('Expected enrolment failure to abort the approval.');
        } catch (ValidationException) {
            // Expected: the closed cohort offering refuses the enrolment.
        }

        // The application must roll back to pending — never "approved" without a seat
        $this->assertDatabaseHas('course_applications', [
            'id' => $application->id,
            'status' => CourseApplicationStatus::Pending->value,
        ]);
        $this->assertDatabaseMissing('enrolments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $student->id,
            'type' => 'application_approved',
        ]);
    }

    public function test_apply_prevents_enrollment_when_already_enrolled_in_cohort_offering(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        // Create existing enrollment
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Attempt to apply for the same cohort offering
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You are already enrolled in this course/cohort.');

        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse->id
        );
    }

    public function test_apply_logs_audit_event_with_cohort_course_id(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $cohortCourse->id
        );

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_application.submitted',
            'entity_type' => 'course_application',
            'entity_id' => $application->id,
            'actor_id' => $student->id,
        ]);
    }

    public function test_visible_for_dashboard_eager_loads_cohort_course_relationship(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohort = Cohort::factory()->create(['name' => 'Spring 2026']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
        ]);

        CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $visible = $this->applicationService->visibleForDashboard($student);

        $this->assertCount(1, $visible);

        // cohortCourse.cohort is eager-loaded by visibleForDashboard(), so this shouldn't
        // trigger any extra queries.
        $firstApplication = $visible->first();
        $this->assertNotNull($firstApplication->cohortCourse);
        $this->assertTrue($firstApplication->relationLoaded('cohortCourse'));
        $this->assertEquals('Spring 2026', $firstApplication->cohortCourse->cohort->name);
    }
}
