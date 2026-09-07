<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class EnrolmentTransferService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EnrolmentService $enrolmentService,
    ) {}

    /**
     * Transfer a student from one course-within-a-cohort to another. This is for
     * admin-mediated transfers when a student has requested a transfer after payment.
     */
    public function transfer(
        Enrolment $oldEnrolment,
        Course $newCourse,
        User $admin,
        CohortCourse $newCohortCourse,
        ?string $note = null
    ): Enrolment {
        if ($oldEnrolment->status !== EnrolmentStatus::TransferRequested) {
            throw ValidationException::withMessages(['status' => 'This enrolment does not have a pending transfer request.']);
        }

        if ($newCohortCourse->course_id !== $newCourse->id) {
            throw ValidationException::withMessages(['cohort_course_id' => 'This cohort offering does not belong to the specified course.']);
        }

        // Check seat capacity on the new cohort_course using the same logic as normal enrollment
        $cohortCourse = CohortCourse::where('id', $newCohortCourse->id)
            ->where('course_id', $newCourse->id)
            ->lockForUpdate()
            ->firstOrFail();

        $status = match ($cohortCourse->status) {
            CourseSectionStatus::Open => EnrolmentStatus::Confirmed,
            CourseSectionStatus::Draft => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort is not yet open for enrollment.']),
            CourseSectionStatus::Closed => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort is closed for enrollment.']),
            CourseSectionStatus::InProgress => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort has already started and is no longer accepting enrollments.']),
            CourseSectionStatus::Completed => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort has already completed.']),
        };

        if ($cohortCourse->capacity !== null && $cohortCourse->seats_taken >= $cohortCourse->capacity) {
            throw ValidationException::withMessages(['cohort_course_id' => 'This cohort has no free seats.']);
        }

        return DB::transaction(function () use ($oldEnrolment, $newCourse, $admin, $cohortCourse, $note, $status) {
            $student = $oldEnrolment->student;
            $oldOrder = $oldEnrolment->order;

            // Create new enrolment
            $newEnrolment = Enrolment::create([
                'student_id' => $student->id,
                'course_id' => $newCourse->id,
                'cohort_course_id' => $cohortCourse->id,
                'status' => $status,
                'source' => EnrolmentSource::Transfer,
                'applied_at' => Carbon::now(),
                'confirmation_email_due_at' => Carbon::now()->addHours($newCourse->confirmation_delay_hours),
            ]);

            // Increment seats_taken if confirmed
            if ($status === EnrolmentStatus::Confirmed) {
                $cohortCourse->increment('seats_taken');
            }

            // Reassign the existing order to the new enrolment
            if ($oldOrder !== null) {
                $oldOrder->update([
                    'enrolment_id' => $newEnrolment->id,
                    'course_id' => $newCourse->id,
                    'transferred_from_enrolment_id' => $oldEnrolment->id,
                ]);
            }

            // Mark old enrolment as transferred, then release the seat it held and promote
            // the oldest waitlisted student in its old cohort_course, if any.
            $oldEnrolment->update([
                'status' => EnrolmentStatus::Transferred,
                'transferred_to_id' => $newEnrolment->id,
                'withdrawal_note' => $note,
            ]);

            $this->enrolmentService->releaseSeatAndPromoteWaitlist($oldEnrolment);

            // Log the transfer
            $this->auditLogger->log(
                action: 'enrolment.transferred',
                entityType: 'enrolment',
                entityId: $oldEnrolment->id,
                actorId: $admin->id,
                meta: [
                    'old_enrolment_id' => $oldEnrolment->id,
                    'new_enrolment_id' => $newEnrolment->id,
                    'old_course_id' => $oldEnrolment->course_id,
                    'new_course_id' => $newCourse->id,
                    'old_cohort_course_id' => $oldEnrolment->cohort_course_id,
                    'new_cohort_course_id' => $cohortCourse->id,
                    'note' => $note,
                ],
            );

            // Notify the student
            $this->notifyStudentOfTransfer($student, $oldEnrolment, $newEnrolment, $note);

            // Evaluate course unlocks for the new course
            $this->progressEngine->evaluateCourseUnlocks($student, $newCourse);

            return $newEnrolment->fresh();
        });
    }

    /**
     * Process a refund for a transfer request.
     *
     * Note: This does NOT call any payment gateway - this system uses manual payment submissions,
     * so "refund" here just marks the financial record. The actual money movement happens outside
     * the LMS (bank transfer, etc.) and admin is just recording that it happened.
     */
    public function refund(
        Enrolment $enrolment,
        User $admin,
        float $refundAmount,
        ?string $note = null
    ): Enrolment {
        if ($enrolment->status !== EnrolmentStatus::TransferRequested) {
            throw ValidationException::withMessages(['status' => 'This enrolment does not have a pending transfer request.']);
        }

        $order = $enrolment->order;

        if ($order === null) {
            throw ValidationException::withMessages(['order' => 'No order found for this enrolment.']);
        }

        if ($refundAmount <= 0) {
            throw ValidationException::withMessages(['refund_amount' => 'Refund amount must be greater than 0.']);
        }

        if ($refundAmount > (float) $order->amount_paid) {
            throw ValidationException::withMessages(['refund_amount' => 'Refund amount cannot exceed the amount paid.']);
        }

        return DB::transaction(function () use ($enrolment, $admin, $refundAmount, $note, $order) {
            // Update order with refund information
            $order->update([
                'refunded_amount' => $refundAmount,
                'refunded_at' => now(),
                'refunded_by' => $admin->id,
            ]);

            // Release the cohort_course seat and promote waitlist
            $this->enrolmentService->releaseSeatAndPromoteWaitlist($enrolment);

            // Mark enrolment as withdrawn
            $enrolment->update([
                'status' => EnrolmentStatus::Withdrawn,
                'withdrawal_note' => $note,
            ]);

            // Log the refund
            $this->auditLogger->log(
                action: 'enrolment.refunded',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $admin->id,
                meta: [
                    'refund_amount' => $refundAmount,
                    'order_id' => $order->id,
                    'cohort_course_id' => $enrolment->cohort_course_id,
                    'note' => $note,
                ],
            );

            // Notify the student
            $this->notifyStudentOfRefund($enrolment->student, $enrolment, $refundAmount, $note);

            return $enrolment->fresh();
        });
    }

    /**
     * Notify student of successful transfer.
     */
    private function notifyStudentOfTransfer(User $student, Enrolment $oldEnrolment, Enrolment $newEnrolment, ?string $note): void
    {
        $this->notificationDispatcher->notifyStudentOfTransfer($student, $oldEnrolment, $newEnrolment, $note);
    }

    /**
     * Notify student of refund.
     */
    private function notifyStudentOfRefund(User $student, Enrolment $enrolment, float $refundAmount, ?string $note): void
    {
        $this->notificationDispatcher->notifyStudentOfRefund($student, $enrolment, $refundAmount, $note);
    }
}
