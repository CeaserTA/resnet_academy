<?php

declare(strict_types=1);

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Enrolment\EnrolmentTransferService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->enrolmentTransferService = app(EnrolmentTransferService::class);
});

describe('EnrolmentTransferService', function (): void {
    describe('transfer', function (): void {
        it('successfully transfers student to new course/section', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $oldSection = CourseSection::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CourseSection::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'section_id' => $oldSection->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'enrolment_id' => $oldEnrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $note = 'Student requested transfer to later cohort';

            $newEnrolment = $this->enrolmentTransferService->transfer(
                $oldEnrolment,
                $newCourse,
                $admin,
                $newSection,
                $note
            );

            expect($newEnrolment->student_id)->toBe($student->id)
                ->and($newEnrolment->course_id)->toBe($newCourse->id)
                ->and($newEnrolment->section_id)->toBe($newSection->id)
                ->and($newEnrolment->status)->toBe(EnrolmentStatus::Confirmed)
                ->and($newEnrolment->source)->toBe(EnrolmentSource::Transfer);

            // Check old enrolment is marked as transferred
            $oldEnrolment->refresh();
            expect($oldEnrolment->status)->toBe(EnrolmentStatus::Transferred)
                ->and($oldEnrolment->transferred_to_id)->toBe($newEnrolment->id)
                ->and($oldEnrolment->withdrawal_note)->toBe($note);

            // Check order is reassigned
            $order->refresh();
            expect($order->enrolment_id)->toBe($newEnrolment->id)
                ->and($order->course_id)->toBe($newCourse->id)
                ->and($order->transferred_from_enrolment_id)->toBe($oldEnrolment->id);

            // Check seat counts - old seat should NOT be released during transfer
            expect($oldSection->fresh()->seats_taken)->toBe(1) // Old seat NOT released (different from refund)
                ->and($newSection->fresh()->seats_taken)->toBe(1); // New seat taken
        });

        it('throws exception when enrolment is not in TransferRequested state', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $newCourse = Course::factory()->create();

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin);
        });

        it('throws exception when new section has no capacity', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $oldSection = CourseSection::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CourseSection::factory()->for($newCourse)->create(['capacity' => 5, 'seats_taken' => 5]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'section_id' => $oldSection->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin, $newSection);
        });

        it('throws exception when section does not belong to specified course', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $newCourse = Course::factory()->create();
            $wrongCourse = Course::factory()->create();
            $wrongSection = CourseSection::factory()->for($wrongCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin, $wrongSection);
        });

        it('throws exception when section is in Draft status', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $newCourse = Course::factory()->create();
            $draftSection = CourseSection::factory()->for($newCourse)->create([
                'capacity' => 10,
                'seats_taken' => 0,
                'status' => CourseSectionStatus::Draft,
            ]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin, $draftSection);
        });

        it('throws exception when student already enrolled in new course (self-paced)', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $newCourse = Course::factory()->create(['sections_required' => false]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            // Student already enrolled in new course
            Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $newCourse->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin);
        });
    });

    describe('refund', function (): void {
        it('successfully processes refund and releases seat', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $refundAmount = 100.00;
            $note = 'Full refund due to schedule conflict';

            $refundedEnrolment = $this->enrolmentTransferService->refund(
                $enrolment,
                $admin,
                $refundAmount,
                $note
            );

            // Check enrolment is withdrawn
            expect($refundedEnrolment->status)->toBe(EnrolmentStatus::Withdrawn)
                ->and($refundedEnrolment->withdrawal_note)->toBe($note);

            // Check order is updated with refund info
            $order->refresh();
            expect($order->refunded_amount)->toBe($refundAmount)
                ->and($order->refunded_at)->not->toBeNull()
                ->and($order->refunded_by)->toBe($admin->id);

            // Check seat is released
            expect($section->fresh()->seats_taken)->toBe(0);
        });

        it('throws exception when enrolment is not in TransferRequested state', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->refund($enrolment, $admin, 50.00);
        });

        it('throws exception when no order exists', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->refund($enrolment, $admin, 50.00);
        });

        it('throws exception when refund amount is zero or negative', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->refund($enrolment, $admin, 0.00);
        });

        it('throws exception when refund amount exceeds amount paid', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 50.00,
                'status' => OrderStatus::Partial,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->refund($enrolment, $admin, 75.00);
        });

        it('allows partial refund', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $partialRefund = 50.00;

            $refundedEnrolment = $this->enrolmentTransferService->refund(
                $enrolment,
                $admin,
                $partialRefund
            );

            $order->refresh();
            expect($order->refunded_amount)->toBe($partialRefund);
        });
    });
});