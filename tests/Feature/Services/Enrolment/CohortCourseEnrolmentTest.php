<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CohortCourseEnrolmentTest extends TestCase
{
    use RefreshDatabase;

    private EnrolmentService $enrolmentService;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Queue::fake();
        Notification::fake();

        $this->enrolmentService = $this->app->make(EnrolmentService::class);
    }

    public function test_enrol_creates_confirmed_enrollment_when_cohort_course_has_capacity(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertEquals($cohortCourse->id, $enrolment->cohort_course_id);
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'seats_taken' => 6,
        ]);

        Queue::assertPushed(SendEnrolmentConfirmationEmail::class);
    }

    public function test_enrol_creates_waitlisted_enrollment_when_cohort_course_is_full(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertEquals(EnrolmentStatus::Waitlisted, $enrolment->status);
        $this->assertEquals($cohortCourse->id, $enrolment->cohort_course_id);
        // Seats_taken should NOT increment for waitlisted
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'seats_taken' => 10,
        ]);

        // No confirmation email should be queued for waitlisted enrollment
        Queue::assertNotPushed(SendEnrolmentConfirmationEmail::class);
    }

    public function test_enrol_does_not_create_order_for_waitlisted_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertEquals(EnrolmentStatus::Waitlisted, $enrolment->status);
        $this->assertDatabaseMissing('orders', [
            'enrolment_id' => $enrolment->id,
        ]);
    }

    public function test_enrol_creates_order_for_confirmed_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertDatabaseHas('orders', [
            'enrolment_id' => $enrolment->id,
            'student_id' => $student->id,
            'course_id' => $course->id,
            'amount' => '100.00',
            'currency' => 'USD',
        ]);
    }

    public function test_enrol_uses_cohort_course_price_override_when_set(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
            'price_override' => 75.00,
            'currency_override' => 'EUR',
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertDatabaseHas('orders', [
            'enrolment_id' => $enrolment->id,
            'amount' => '75.00',
            'currency' => 'EUR',
        ]);
    }

    public function test_enrol_rejects_enrollment_when_cohort_course_is_draft(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('This cohort is not yet open for enrollment.');

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);
    }

    public function test_enrol_rejects_enrollment_when_cohort_course_is_closed(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Closed,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('This cohort is closed for enrollment.');

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);
    }

    public function test_enrol_rejects_enrollment_when_cohort_course_is_in_progress(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::InProgress,
        ]);

        $this->expectException(ValidationException::class);

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);
    }

    public function test_enrol_rejects_enrollment_when_cohort_course_is_completed(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Completed,
        ]);

        $this->expectException(ValidationException::class);

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);
    }

    public function test_enrol_allows_student_to_enroll_in_different_cohort_offerings(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse1 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);
        $cohortCourse2 = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $enrolment1 = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse1->id);
        $enrolment2 = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse2->id);

        $this->assertEquals($cohortCourse1->id, $enrolment1->cohort_course_id);
        $this->assertEquals($cohortCourse2->id, $enrolment2->cohort_course_id);
        $this->assertCount(2, Enrolment::where('student_id', $student->id)->where('course_id', $course->id)->get());
    }

    public function test_enrol_with_unlimited_capacity_never_creates_waitlisted(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => null, // Unlimited
            'seats_taken' => 1000,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'seats_taken' => 1001,
        ]);
    }

    public function test_enrol_logs_audit_event_for_confirmed_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'enrolment.confirmed',
            'entity_type' => 'enrolment',
            'entity_id' => $enrolment->id,
            'actor_id' => $student->id,
        ]);
    }

    public function test_enrol_logs_audit_event_for_waitlisted_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 5,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'enrolment.waitlisted',
            'entity_type' => 'enrolment',
            'entity_id' => $enrolment->id,
            'actor_id' => $student->id,
        ]);
    }
}
