<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Exceptions\EnrolmentAlreadyHasPendingTransferException;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->enrolmentService = app(EnrolmentService::class);
});

describe('EnrolmentService', function (): void {
    describe('withdraw', function (): void {
        it('withdraws directly when no payment has been made', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 0.00,
                'status' => OrderStatus::Pending,
            ]);

            $result = $this->enrolmentService->withdraw($enrolment, $student);

            expect($result->status)->toBe(EnrolmentStatus::Withdrawn)
                ->and($section->fresh()->seats_taken)->toBe(0);
        });

        it('withdraws directly when order does not exist', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $result = $this->enrolmentService->withdraw($enrolment, $student);

            expect($result->status)->toBe(EnrolmentStatus::Withdrawn)
                ->and($section->fresh()->seats_taken)->toBe(0);
        });

        it('creates transfer request when payment has been made', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 50.00,
                'status' => OrderStatus::Partial,
            ]);

            $note = 'Need to transfer to next cohort';

            $result = $this->enrolmentService->withdraw($enrolment, $student, $note);

            expect($result->status)->toBe(EnrolmentStatus::TransferRequested)
                ->and($result->transfer_requested_at)->not->toBeNull()
                ->and($result->withdrawal_note)->toBe($note)
                ->and($section->fresh()->seats_taken)->toBe(1); // Capacity not released
        });

        it('throws exception when duplicate transfer request is attempted', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 50.00,
                'status' => OrderStatus::Partial,
            ]);

            $this->expectException(EnrolmentAlreadyHasPendingTransferException::class);

            $this->enrolmentService->withdraw($enrolment, $student, 'Another note');
        });

        it('saves withdrawal note when provided', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $note = 'Schedule conflict with work';

            $result = $this->enrolmentService->withdraw($enrolment, $student, $note);

            expect($result->withdrawal_note)->toBe($note);
        });

        it('handles null withdrawal note', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $order = Order::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'enrolment_id' => $enrolment->id,
                'amount' => 100.00,
                'amount_paid' => 100.00,
                'status' => OrderStatus::Paid,
            ]);

            $result = $this->enrolmentService->withdraw($enrolment, $student, null);

            expect($result->withdrawal_note)->toBeNull();
        });
    });

    describe('cancelTransferRequest', function (): void {
        it('cancels transfer request and reverts to Confirmed status', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
                'withdrawal_note' => 'Original note',
            ]);

            $result = $this->enrolmentService->cancelTransferRequest($enrolment, $student);

            expect($result->status)->toBe(EnrolmentStatus::Confirmed)
                ->and($result->transfer_requested_at)->toBeNull()
                ->and($result->withdrawal_note)->toBeNull();
        });

        it('throws exception when enrolment is not in TransferRequested state', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentService->cancelTransferRequest($enrolment, $student);
        });

        it('throws exception when enrolment is already Withdrawn', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Withdrawn,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentService->cancelTransferRequest($enrolment, $student);
        });

        it('throws exception when enrolment is Waitlisted', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Waitlisted,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentService->cancelTransferRequest($enrolment, $student);
        });
    });

    describe('changeStatus with transfer statuses', function (): void {
        it('throws exception when trying to change to TransferRequested via changeStatus', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentService->changeStatus($enrolment, EnrolmentStatus::TransferRequested, $student);
        });

        it('throws exception when trying to change to Transferred via changeStatus', function (): void {
            $student = User::factory()->student()->create();
            $course = Course::factory()->create();
            $section = CourseSection::factory()->for($course)->create(['capacity' => 10, 'seats_taken' => 1]);

            $enrolment = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Confirmed,
            ]);

            $this->expectException(ValidationException::class);

            $this->enrolmentService->changeStatus($enrolment, EnrolmentStatus::Transferred, $student);
        });
    });
});