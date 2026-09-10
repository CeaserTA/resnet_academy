<?php

declare(strict_types=1);

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Models\Course;
use App\Models\CohortCourse;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Enrolment\EnrolmentTransferService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
            $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'cohort_course_id' => $oldSection->id,
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
                ->and($newEnrolment->cohort_course_id)->toBe($newSection->id)
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

            // Check seat counts - the old seat is released (and its waitlist promoted, if any)
            // as part of the transfer, same as any other withdrawal — see
            // EnrolmentTransferService::transfer()'s call to releaseSeatAndPromoteWaitlist().
            expect($oldSection->fresh()->seats_taken)->toBe(0)
                ->and($newSection->fresh()->seats_taken)->toBe(1); // New seat taken
        });

        it('throws exception when enrolment is not in TransferRequested state', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();

            $oldCourse = Course::factory()->create();
            $newCourse = Course::factory()->create();
            $newCohortCourse = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin, $newCohortCourse);
        });

        it('throws exception when new section has no capacity', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $oldCourse = Course::factory()->create();
            $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);
            
            $newCourse = Course::factory()->create();
            $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 5, 'seats_taken' => 5]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'cohort_course_id' => $oldSection->id,
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
            $wrongSection = CohortCourse::factory()->for($wrongCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

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
            $draftSection = CohortCourse::factory()->for($newCourse)->create([
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

    });

    describe('refund', function (): void {
        it('successfully processes refund and releases seat', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();
            
            $course = Course::factory()->create();
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
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
            expect($order->refunded_amount)->toBe(number_format($refundAmount, 2, '.', ''))
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
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
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
            expect($order->refunded_amount)->toBe(number_format($partialRefund, 2, '.', ''));
        });
    });

    describe('atomicity', function (): void {
        it('rolls back the new enrolment, seat increment, and order reassignment if a later write in transfer() fails', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();

            $oldCourse = Course::factory()->create();
            $oldSection = CohortCourse::factory()->for($oldCourse)->create(['capacity' => 10, 'seats_taken' => 1]);

            $newCourse = Course::factory()->create();
            $newSection = CohortCourse::factory()->for($newCourse)->create(['capacity' => 10, 'seats_taken' => 0]);

            $oldEnrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'cohort_course_id' => $oldSection->id,
                'status' => EnrolmentStatus::TransferRequested,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $oldCourse->id,
                'enrolment_id' => $oldEnrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            // Simulate a failure on the audit-log write, which happens after the new enrolment
            // is created, the seat is incremented, the old order is reassigned, and the old
            // enrolment is marked transferred — all of that must roll back together.
            DB::beforeExecuting(function (string $query): void {
                if (str_contains($query, 'insert into `audit_logs`')) {
                    throw new RuntimeException('Simulated failure for atomicity test');
                }
            });

            expect(fn () => $this->enrolmentTransferService->transfer($oldEnrolment, $newCourse, $admin, $newSection))
                ->toThrow(RuntimeException::class);

            expect(Enrolment::query()->where('course_id', $newCourse->id)->exists())->toBeFalse('the new enrolment should not have been persisted')
                ->and($newSection->fresh()->seats_taken)->toBe(0, 'the seat increment should have rolled back')
                ->and($oldSection->fresh()->seats_taken)->toBe(1, 'the old section seat count should be untouched')
                ->and($oldEnrolment->fresh()->status)->toBe(EnrolmentStatus::TransferRequested, 'the old enrolment should not have been marked transferred')
                ->and($order->fresh()->course_id)->toBe($oldCourse->id, 'the order should not have been reassigned to the new course');
        });

        it('rolls back the refund fields and seat release if a later write in refund() fails', function (): void {
            $student = User::factory()->student()->create();
            $admin = User::factory()->admin()->create();

            $course = Course::factory()->create();
            $section = CohortCourse::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $section->id,
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

            // Simulate a failure on the audit-log write, which happens after the order's refund
            // fields are set and the seat is released — both must roll back together.
            DB::beforeExecuting(function (string $query): void {
                if (str_contains($query, 'insert into `audit_logs`')) {
                    throw new RuntimeException('Simulated failure for atomicity test');
                }
            });

            expect(fn () => $this->enrolmentTransferService->refund($enrolment, $admin, 100.00, 'test'))
                ->toThrow(RuntimeException::class);

            expect($order->fresh()->refunded_amount)->toBeNull('the refund fields should not have been persisted')
                ->and($order->fresh()->refunded_at)->toBeNull()
                ->and($section->fresh()->seats_taken)->toBe(1, 'the seat release should have rolled back')
                ->and($enrolment->fresh()->status)->toBe(EnrolmentStatus::TransferRequested, 'the enrolment should not have been marked withdrawn');
        });
    });
});