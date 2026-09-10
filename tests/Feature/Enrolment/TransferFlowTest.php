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
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->student = User::factory()->student()->create();
    $this->admin = User::factory()->admin()->create();
});

describe('Transfer Flow Feature Tests', function (): void {
    describe('Student withdrawal flows', function (): void {
        it('withdraws from unpaid enrolment → Withdrawn, seat released, no admin notification', function (): void {
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

            // Check enrolment status
            $enrolment->refresh();
            expect($enrolment->status)->toBe(EnrolmentStatus::Withdrawn);

            // Check seat was released
            expect($section->fresh()->seats_taken)->toBe(0);

            // Check no admin notification was created
            $this->assertDatabaseMissing('notifications', [
                'user_id' => $this->admin->id,
                'type' => 'transfer_request',
            ]);
        });

        it('withdraws from paid enrolment → TransferRequested, seat NOT released, admin notified', function (): void {
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

            // Check enrolment status
            $enrolment->refresh();
            expect($enrolment->status)->toBe(EnrolmentStatus::TransferRequested);
            expect($enrolment->transfer_requested_at)->not->toBeNull();
            expect($enrolment->withdrawal_note)->toBe('Need to transfer to next cohort');

            // Check seat was NOT released
            expect($section->fresh()->seats_taken)->toBe(1);

            // Check admin notification was created
            $this->assertDatabaseHas('notifications', [
                'user_id' => $this->admin->id,
                'type' => 'transfer_request',
                'channel' => NotificationChannel::InApp->value,
                'related_entity_type' => 'enrolment',
                'related_entity_id' => $enrolment->id,
            ]);
        });

        it('prevents duplicate transfer request with 409 conflict', function (): void {
            $course = Course::factory()->create();
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $this->student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
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

            $response->assertStatus(409);
            $response->assertJson(['message' => 'You already have a pending transfer request.']);

            // Check no duplicate request was created
            $this->assertDatabaseCount('notifications', 0);
        });

        it('cancels transfer request → status reverts to Confirmed', function (): void {
            $course = Course::factory()->create();
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $this->student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
                'withdrawal_note' => 'Need to transfer',
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
                ->postJson("/api/v1/enrolments/{$enrolment->id}/cancel-transfer-request");

            $response->assertOk();

            // Check enrolment status reverted
            $enrolment->refresh();
            expect($enrolment->status)->toBe(EnrolmentStatus::Confirmed);
            expect($enrolment->transfer_requested_at)->toBeNull();
            expect($enrolment->withdrawal_note)->toBeNull();

            // Check seat still taken (no release on cancellation)
            expect($section->fresh()->seats_taken)->toBe(1);
        });
    });

    describe('Admin transfer flows', function (): void {
        it('transfers TransferRequested enrolment to new course → new enrolment created, old Transferred, order moved', function (): void {
            $oldCourse = Course::factory()->create();
            $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $this->student->id,
                'course_id' => $oldCourse->id,
                'cohort_course_id' => $oldSection->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
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
                    'note' => 'Transferred to later cohort',
                ]);

            $response->assertOk();

            // Check new enrolment created
            $newEnrolment = Enrolment::where('student_id', $this->student->id)
                ->where('course_id', $newCourse->id)
                ->where('cohort_course_id', $newSection->id)
                ->first();

            expect($newEnrolment)->not->toBeNull()
                ->and($newEnrolment->status)->toBe(EnrolmentStatus::Confirmed)
                ->and($newEnrolment->source)->toBe(EnrolmentSource::Transfer);

            // Check old enrolment marked as transferred
            $oldEnrolment->refresh();
            expect($oldEnrolment->status)->toBe(EnrolmentStatus::Transferred)
                ->and($oldEnrolment->transferred_to_id)->toBe($newEnrolment->id)
                ->and($oldEnrolment->withdrawal_note)->toBe('Transferred to later cohort');

            // Check order reassigned
            $order->refresh();
            expect($order->enrolment_id)->toBe($newEnrolment->id)
                ->and($order->course_id)->toBe($newCourse->id)
                ->and($order->transferred_from_enrolment_id)->toBe($oldEnrolment->id);

            // Check seat counts - the old seat is released (and its waitlist promoted, if
            // any) as part of the transfer, same as any withdrawal — see
            // EnrolmentTransferService::transfer()'s call to releaseSeatAndPromoteWaitlist().
            expect($oldSection->fresh()->seats_taken)->toBe(0);
            expect($newSection->fresh()->seats_taken)->toBe(1);

            // Check student notification
            $this->assertDatabaseHas('notifications', [
                'user_id' => $this->student->id,
                'type' => 'transfer_approved',
                'channel' => NotificationChannel::Email->value,
                'related_entity_type' => 'enrolment',
                'related_entity_id' => $newEnrolment->id,
            ]);
        });

        it('rejects transfer to full course/section with clear error', function (): void {
            $oldCourse = Course::factory()->create();
            $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 5, 'seats_taken' => 5]);

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

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['cohort_course_id'], responseKey: 'error.fields');

            // Check no state changes persisted
            $oldEnrolment->refresh();
            expect($oldEnrolment->status)->toBe(EnrolmentStatus::TransferRequested);

            expect($newSection->fresh()->seats_taken)->toBe(5); // Still full

            // Check no new enrolment created
            $this->assertDatabaseMissing('enrolments', [
                'student_id' => $this->student->id,
                'course_id' => $newCourse->id,
            ]);
        });
    });

    describe('Admin refund flows', function (): void {
        it('processes refund → order updated, enrolment Withdrawn, seat released, waitlist promotion', function (): void {
            $course = Course::factory()->create();
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            // Create a waitlisted student
            $waitlistedStudent = User::factory()->student()->create();
            $waitlistedEnrolment = Enrolment::factory()->create([
                'student_id' => $waitlistedStudent->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
                'status' => EnrolmentStatus::Waitlisted,
            ]);

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

            // Check enrolment is withdrawn
            $enrolment->refresh();
            expect($enrolment->status)->toBe(EnrolmentStatus::Withdrawn)
                ->and($enrolment->withdrawal_note)->toBe('Full refund due to schedule conflict');

            // Check order updated with refund info
            $order->refresh();
            expect($order->refunded_amount)->toBe('100.00')
                ->and($order->refunded_at)->not->toBeNull()
                ->and($order->refunded_by)->toBe($this->admin->id);

            // Check waitlist promotion — release and promotion happen inside one transaction,
            // so the seat is never observably "released" from outside; it goes straight from
            // the withdrawn student to the promoted one, staying at 1 throughout.
            $waitlistedEnrolment->refresh();
            expect($waitlistedEnrolment->status)->toBe(EnrolmentStatus::Confirmed);
            expect($section->fresh()->seats_taken)->toBe(1);

            // Check promoted student has order
            $promotedOrder = Order::where('enrolment_id', $waitlistedEnrolment->id)->first();
            expect($promotedOrder)->not->toBeNull();

            // Check student notification
            $this->assertDatabaseHas('notifications', [
                'user_id' => $this->student->id,
                'type' => 'refund_processed',
                'channel' => NotificationChannel::Email->value,
                'related_entity_type' => 'enrolment',
                'related_entity_id' => $enrolment->id,
            ]);
        });

        it('rejects refund amount greater than amount_paid', function (): void {
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
                'amount_paid' => 50.00,
                'status' => OrderStatus::Partial,
            ]);

            $response = $this->actingAs($this->admin)
                ->postJson("/api/v1/admin/enrolments/{$enrolment->id}/refund", [
                    'refund_amount' => 75.00,
                ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['refund_amount'], responseKey: 'error.fields');

            // Check no state changes
            $enrolment->refresh();
            expect($enrolment->status)->toBe(EnrolmentStatus::TransferRequested);

            $order->refresh();
            expect($order->refunded_amount)->toBeNull();
            expect($order->refunded_at)->toBeNull();

            // Check seat still taken
            expect($section->fresh()->seats_taken)->toBe(1);
        });

        it('allows partial refund', function (): void {
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
                    'refund_amount' => 50.00,
                ]);

            $response->assertOk();

            // Check partial refund recorded
            $order->refresh();
            expect($order->refunded_amount)->toBe('50.00');
        });
    });
});