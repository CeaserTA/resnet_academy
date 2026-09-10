<?php

declare(strict_types=1);

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\NotificationChannel;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\CohortCourse;
use App\Models\Enrolment;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;

describe('Transfer Notifications', function (): void {
    beforeEach(function (): void {
        $this->admin = User::factory()->admin()->create();
        $this->student = User::factory()->student()->create();
    });

    it('creates admin notification when student requests transfer after payment', function (): void {
        $course = Course::factory()->create();
        $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

        $enrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => 100.00,
            'amount_paid' => 50.00,
            'status' => OrderStatus::Partial,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/v1/enrolments/{$enrolment->id}/withdraw", [
                'note' => 'Need to transfer to next cohort',
            ]);

        $response->assertOk();

        // Check that admin notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'transfer_request',
            'channel' => NotificationChannel::InApp->value,
            'related_entity_type' => 'enrolment',
            'related_entity_id' => $enrolment->id,
        ]);

        // Check notification content
        $notification = Notification::where('user_id', $this->admin->id)
            ->where('type', 'transfer_request')
            ->first();

        expect($notification->title)->toContain($this->student->name)
            ->and($notification->body)->toContain($course->title)
            ->and($notification->body)->toContain('50');
    });

    it('creates student notification when admin approves transfer', function (): void {
        $oldCourse = Course::factory()->create();
        $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
        
        $newCourse = Course::factory()->create();
        $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

        $oldEnrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $oldCourse->id,
            'cohort_course_id' => $oldSection->id,
            'status' => EnrolmentStatus::TransferRequested,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $oldCourse->id,
            'enrolment_id' => $oldEnrolment->id,
            'amount' => 100.00,
            'amount_paid' => 100.00,
            'status' => OrderStatus::Paid,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/enrolments/{$oldEnrolment->id}/transfer", [
                'course_id' => $newCourse->id,
                'cohort_course_id' => $newSection->id,
                'note' => 'Transferred to later cohort per request',
            ]);

        $response->assertOk();

        // Check that student notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->student->id,
            'type' => 'transfer_approved',
            'channel' => NotificationChannel::Email->value,
            'related_entity_type' => 'enrolment',
        ]);

        // Check notification content
        $notification = Notification::where('user_id', $this->student->id)
            ->where('type', 'transfer_approved')
            ->first();

        expect($notification->title)->toContain($newCourse->title)
            ->and($notification->body)->toContain($oldCourse->title)
            ->and($notification->body)->toContain($newCourse->title)
            ->and($notification->body)->toContain('Transferred to later cohort per request');
    });

    it('creates student notification when admin processes refund', function (): void {
        $course = Course::factory()->create();
        $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

        $enrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $section->id,
            'status' => EnrolmentStatus::TransferRequested,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => 100.00,
            'amount_paid' => 100.00,
            'status' => OrderStatus::Paid,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/enrolments/{$enrolment->id}/refund", [
                'refund_amount' => 100.00,
                'note' => 'Full refund due to schedule conflict',
            ]);

        $response->assertOk();

        // Check that student notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->student->id,
            'type' => 'refund_processed',
            'channel' => NotificationChannel::Email->value,
            'related_entity_type' => 'enrolment',
            'related_entity_id' => $enrolment->id,
        ]);

        // Check notification content
        $notification = Notification::where('user_id', $this->student->id)
            ->where('type', 'refund_processed')
            ->first();

        expect($notification->title)->toContain($course->title)
            ->and($notification->body)->toContain('100')
            ->and($notification->body)->toContain($course->title)
            ->and($notification->body)->toContain('Full refund due to schedule conflict');
    });

    it('does not create admin notification when student withdraws without payment', function (): void {
        $course = Course::factory()->create();
        $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

        $enrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => 100.00,
            'amount_paid' => 0.00,
            'status' => OrderStatus::Pending,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/v1/enrolments/{$enrolment->id}/withdraw");

        $response->assertOk();

        // Check that no admin notification was created
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'transfer_request',
        ]);
    });

    it('creates notification for all admins when transfer request is made', function (): void {
        $secondAdmin = User::factory()->admin()->create();
        
        $course = Course::factory()->create();
        $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

        $enrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => 100.00,
            'amount_paid' => 50.00,
            'status' => OrderStatus::Partial,
        ]);

        $response = $this->actingAs($this->student)
            ->postJson("/api/v1/enrolments/{$enrolment->id}/withdraw");

        $response->assertOk();

        // Check that both admins received notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'transfer_request',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $secondAdmin->id,
            'type' => 'transfer_request',
        ]);
    });

    it('uses email channel for financial transfer notifications', function (): void {
        $oldCourse = Course::factory()->create();
        $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);

        $newCourse = Course::factory()->create();
        $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

        $oldEnrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $oldCourse->id,
            'cohort_course_id' => $oldSection->id,
            'status' => EnrolmentStatus::TransferRequested,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $oldCourse->id,
            'enrolment_id' => $oldEnrolment->id,
            'amount' => 100.00,
            'amount_paid' => 100.00,
            'status' => OrderStatus::Paid,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/enrolments/{$oldEnrolment->id}/transfer", [
                'course_id' => $newCourse->id,
                'cohort_course_id' => $newSection->id,
            ]);

        $response->assertOk();

        // Check that email channel was used
        $notification = Notification::where('user_id', $this->student->id)
            ->where('type', 'transfer_approved')
            ->first();

        expect($notification->channel)->toBe(NotificationChannel::Email);
    });

    it('uses email channel for financial refund notifications', function (): void {
        $course = Course::factory()->create();
        $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

        $enrolment = Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $section->id,
            'status' => EnrolmentStatus::TransferRequested,
        ]);

        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => 100.00,
            'amount_paid' => 100.00,
            'status' => OrderStatus::Paid,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/enrolments/{$enrolment->id}/refund", [
                'refund_amount' => 100.00,
            ]);

        $response->assertOk();

        // Check that email channel was used
        $notification = Notification::where('user_id', $this->student->id)
            ->where('type', 'refund_processed')
            ->first();

        expect($notification->channel)->toBe(NotificationChannel::Email);
    });
});