<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class CourseSectionWaitlistTest extends TestCase
{
    use RefreshDatabase;

    private EnrolmentService $enrolmentService;

    protected function setUp(): void
    {
        parent::setUp();
        
        Mail::fake();
        Queue::fake();
        
        $this->enrolmentService = $this->app->make(EnrolmentService::class);
    }

    public function test_withdraw_promotes_oldest_waitlisted_student(): void
    {
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 2,
            'seats_taken' => 2,
        ]);

        // Create confirmed enrollments (fills capacity)
        $confirmedStudent1 = User::factory()->create();
        $confirmedStudent2 = User::factory()->create();
        $enrolment1 = Enrolment::factory()->create([
            'student_id' => $confirmedStudent1->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Order::factory()->create(['enrolment_id' => $enrolment1->id]);

        $enrolment2 = Enrolment::factory()->create([
            'student_id' => $confirmedStudent2->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Order::factory()->create(['enrolment_id' => $enrolment2->id]);

        // Create waitlisted enrollments (first one should be promoted first)
        $waitlistedStudent1 = User::factory()->create();
        $waitlistedStudent2 = User::factory()->create();
        
        $waitlistedEnrolment1 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent1->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHours(2),
        ]);

        $waitlistedEnrolment2 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent2->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHour(),
        ]);

        // Withdraw first confirmed student
        $this->enrolmentService->withdraw($enrolment1, $confirmedStudent1);

        // Check that oldest waitlisted student was promoted
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolment1->id,
            'status' => EnrolmentStatus::Confirmed->value,
        ]);

        // Second waitlisted student should still be waitlisted
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolment2->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // Seats_taken should remain at 2 (decrement then increment on promotion)
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 2,
        ]);
    }

    public function test_withdraw_creates_order_for_promoted_student(): void
    {
        $course = Course::factory()->create(['price' => 150.00, 'currency' => 'EUR']);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 1,
            'seats_taken' => 1,
        ]);

        $confirmedStudent = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $confirmedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Order::factory()->create(['enrolment_id' => $enrolment->id]);

        $waitlistedStudent = User::factory()->create();
        $waitlistedEnrolment = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        // No order should exist for waitlisted enrollment yet
        $this->assertDatabaseMissing('orders', [
            'enrolment_id' => $waitlistedEnrolment->id,
        ]);

        // Withdraw confirmed student (triggers promotion)
        $this->enrolmentService->withdraw($enrolment, $confirmedStudent);

        // Order should now exist for promoted student
        $this->assertDatabaseHas('orders', [
            'enrolment_id' => $waitlistedEnrolment->id,
            'student_id' => $waitlistedStudent->id,
            'course_id' => $course->id,
            'amount' => '150.00',
            'currency' => 'EUR',
            'status' => OrderStatus::Pending->value,
        ]);
    }

    public function test_withdraw_logs_audit_event_for_promotion(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 1,
            'seats_taken' => 1,
        ]);

        $confirmedStudent = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $confirmedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $waitlistedStudent = User::factory()->create();
        $waitlistedEnrolment = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        $this->enrolmentService->withdraw($enrolment, $confirmedStudent);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'enrolment.promoted_from_waitlist',
            'entity_type' => 'enrolment',
            'entity_id' => $waitlistedEnrolment->id,
            'actor_id' => $waitlistedStudent->id,
        ]);
    }

    public function test_withdraw_sends_notification_on_promotion(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 1,
            'seats_taken' => 1,
            'name' => 'Spring 2026 Cohort',
        ]);

        $confirmedStudent = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $confirmedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $waitlistedStudent = User::factory()->create();
        $waitlistedEnrolment = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        $this->enrolmentService->withdraw($enrolment, $confirmedStudent);

        // Check that notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $waitlistedStudent->id,
            'type' => 'waitlist_promoted',
            'related_entity_type' => 'enrolment',
            'related_entity_id' => $waitlistedEnrolment->id,
        ]);
        
        // Verify notification was actually sent via database (not using assertSentTo as it requires specific notification class)
    }

    public function test_multiple_withdrawals_promote_multiple_students(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 3,
            'seats_taken' => 3,
        ]);

        // Create 3 confirmed enrollments
        $confirmedStudents = User::factory()->count(3)->create();
        $confirmedEnrolments = [];
        foreach ($confirmedStudents as $student) {
            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);
            Order::factory()->create(['enrolment_id' => $enrolment->id]);
            $confirmedEnrolments[] = $enrolment;
        }

        // Create 3 waitlisted enrollments
        $waitlistedStudents = User::factory()->count(3)->create();
        $waitlistedEnrolments = [];
        foreach ($waitlistedStudents as $index => $student) {
            $waitlistedEnrolments[] = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Waitlisted,
                'created_at' => now()->subHours(3 - $index),
            ]);
        }

        // Withdraw first confirmed student
        $this->enrolmentService->withdraw($confirmedEnrolments[0], $confirmedStudents[0]);

        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolments[0]->id,
            'status' => EnrolmentStatus::Confirmed->value,
        ]);
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolments[1]->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // Withdraw second confirmed student
        $this->enrolmentService->withdraw($confirmedEnrolments[1], $confirmedStudents[1]);

        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolments[1]->id,
            'status' => EnrolmentStatus::Confirmed->value,
        ]);
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlistedEnrolments[2]->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // Seats should remain at 3
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 3,
        ]);
    }

    public function test_withdraw_decrements_seats_when_no_waitlisted_students(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $confirmedStudent = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $confirmedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $this->enrolmentService->withdraw($enrolment, $confirmedStudent);

        // Seats should decrement with no promotion
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 4,
        ]);
    }

    public function test_withdraw_self_paced_enrollment_does_not_affect_section(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $student = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => null, // Self-paced
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $this->enrolmentService->withdraw($enrolment, $student);

        // Seats_taken should remain unchanged
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 5,
        ]);
    }

    public function test_withdraw_logs_status_change_audit_event(): void
    {
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
            'seats_taken' => 1, // Must have at least 1 seat taken for confirmed enrollment
        ]);

        $student = User::factory()->create();
        $enrolment = Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $this->enrolmentService->withdraw($enrolment, $student);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'enrolment.status_changed',
            'entity_type' => 'enrolment',
            'entity_id' => $enrolment->id,
            'actor_id' => $student->id,
        ]);
    }
}
