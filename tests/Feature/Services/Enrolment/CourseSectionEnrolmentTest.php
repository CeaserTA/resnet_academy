<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class CourseSectionEnrolmentTest extends TestCase
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

    public function test_enrol_creates_confirmed_enrollment_when_section_has_capacity(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertEquals($section->id, $enrolment->section_id);
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 6,
        ]);
        
        Queue::assertPushed(SendEnrolmentConfirmationEmail::class);
    }

    public function test_enrol_creates_waitlisted_enrollment_when_section_is_full(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertEquals(EnrolmentStatus::Waitlisted, $enrolment->status);
        $this->assertEquals($section->id, $enrolment->section_id);
        // Seats_taken should NOT increment for waitlisted
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 10,
        ]);
        
        // No confirmation email should be queued for waitlisted enrollment
        Queue::assertNotPushed(SendEnrolmentConfirmationEmail::class);
    }

    public function test_enrol_does_not_create_order_for_waitlisted_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertEquals(EnrolmentStatus::Waitlisted, $enrolment->status);
        $this->assertDatabaseMissing('orders', [
            'enrolment_id' => $enrolment->id,
        ]);
    }

    public function test_enrol_creates_order_for_confirmed_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertDatabaseHas('orders', [
            'enrolment_id' => $enrolment->id,
            'student_id' => $student->id,
            'course_id' => $course->id,
            'amount' => '100.00',
            'currency' => 'USD',
        ]);
    }

    public function test_enrol_rejects_enrollment_when_section_is_draft(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('This section is not yet open for enrollment.');

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);
    }

    public function test_enrol_rejects_enrollment_when_section_is_closed(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Closed,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('This section is closed for enrollment.');

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);
    }

    public function test_enrol_requires_section_id_when_course_sections_required_is_true(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['sections_required' => true]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('This course requires enrollment in a specific section.');

        // Try to enroll without section_id when sections_required is true
        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, null);
    }

    public function test_enrol_allows_self_paced_when_sections_required_is_false(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'sections_required' => false,
            'price' => 100.00,
        ]);
        // Create a section but don't require it
        CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, null);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertNull($enrolment->section_id);
    }

    public function test_enrol_prevents_duplicate_self_paced_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);

        // First enrollment (self-paced, section_id = null)
        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, null);

        // Attempt duplicate self-paced enrollment
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('You are already enrolled in this course.');

        $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, null);
    }

    public function test_enrol_allows_student_to_enroll_in_different_sections(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
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

        $enrolment1 = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section1->id);
        $enrolment2 = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section2->id);

        $this->assertEquals($section1->id, $enrolment1->section_id);
        $this->assertEquals($section2->id, $enrolment2->section_id);
        $this->assertCount(2, Enrolment::where('student_id', $student->id)->where('course_id', $course->id)->get());
    }

    public function test_enrol_with_unlimited_capacity_never_creates_waitlisted(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => null, // Unlimited
            'seats_taken' => 1000,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertEquals(EnrolmentStatus::Confirmed, $enrolment->status);
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 1001,
        ]);
    }

    public function test_enrol_logs_audit_event_for_confirmed_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

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
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 5,
            'seats_taken' => 5,
        ]);

        $enrolment = $this->enrolmentService->enrol($student, $course, EnrolmentSource::Self, $section->id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'enrolment.waitlisted',
            'entity_type' => 'enrolment',
            'entity_id' => $enrolment->id,
            'actor_id' => $student->id,
        ]);
    }
}
