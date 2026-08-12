<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Enrolment;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Enrolment\CourseApplicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CourseSectionApplicationTest extends TestCase
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

    public function test_apply_accepts_section_id_for_sectioned_course(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1', 2 => 'Answer 2'],
            'https://portfolio.example.com',
            null,
            $section->id
        );

        $this->assertEquals($section->id, $application->section_id);
        $this->assertEquals(CourseApplicationStatus::Pending, $application->status);
    }

    public function test_apply_allows_multiple_pending_applications_across_different_sections(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section1 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'name' => 'Spring 2026',
        ]);
        $section2 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'name' => 'Fall 2026',
        ]);

        $application1 = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $section1->id
        );

        $application2 = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $section2->id
        );

        $this->assertEquals($section1->id, $application1->section_id);
        $this->assertEquals($section2->id, $application2->section_id);
        $this->assertEquals(CourseApplicationStatus::Pending, $application1->status);
        $this->assertEquals(CourseApplicationStatus::Pending, $application2->status);
    }

    public function test_apply_prevents_duplicate_pending_application_for_same_section(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
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
            $section->id
        );

        // Attempt duplicate for same section
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You already have a pending application for this course/section.');

        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $section->id
        );
    }

    public function test_apply_prevents_duplicate_self_paced_application(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);

        // First self-paced application (no section)
        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            null
        );

        // Attempt duplicate self-paced application
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You already have a pending application for this course/section.');

        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            null
        );
    }

    public function test_approve_passes_section_id_to_enrolment_service(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 0,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $this->applicationService->approve($application, $reviewer);

        // Check that enrollment was created with section_id
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
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
        $section1 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'name' => 'Spring 2026',
        ]);
        $section2 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'name' => 'Fall 2026',
        ]);

        // Create two pending applications for different sections
        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        // Approve first application
        $this->applicationService->approve($application1, $reviewer);

        // Check that first application is approved
        $this->assertDatabaseHas('course_applications', [
            'id' => $application1->id,
            'status' => CourseApplicationStatus::Approved->value,
        ]);

        // Check that second application was auto-cancelled
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Rejected->value,
            'rejection_reason' => 'Auto-cancelled because you were enrolled in another section of this course.',
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
        $section1 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);
        $section2 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $this->applicationService->approve($application1, $reviewer);

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
        $this->applicationService->approve($application1, $reviewer);

        // Application for course2 should remain pending
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Pending->value,
        ]);
    }

    public function test_approve_with_waitlisted_enrollment_still_cancels_other_applications(): void
    {
        $student = User::factory()->create();
        $reviewer = User::factory()->admin()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
            'price' => 100.00,
        ]);
        $section1 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 1,
            'seats_taken' => 1, // Full section
        ]);
        $section2 = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application1 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section1->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $application2 = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section2->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        // Approve application for full section (creates waitlisted enrollment)
        $this->applicationService->approve($application1, $reviewer);

        // Check that enrollment was waitlisted
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section1->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // Other application should still be auto-cancelled
        $this->assertDatabaseHas('course_applications', [
            'id' => $application2->id,
            'status' => CourseApplicationStatus::Rejected->value,
        ]);
    }

    public function test_apply_prevents_enrollment_when_already_enrolled_in_section(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        // Create existing enrollment
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Attempt to apply for the same section
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You are already enrolled in this course/section.');

        $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $section->id
        );
    }

    public function test_apply_logs_audit_event_with_section_id(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application = $this->applicationService->apply(
            $student,
            $course,
            [1 => 'Answer 1'],
            null,
            null,
            $section->id
        );

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_application.submitted',
            'entity_type' => 'course_application',
            'entity_id' => $application->id,
            'actor_id' => $student->id,
        ]);
    }
}
