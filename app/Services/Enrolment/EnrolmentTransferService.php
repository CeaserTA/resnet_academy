<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
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
    ) {}

    /**
     * Transfer a student from one course/section to another.
     * This is for admin-mediated transfers when a student has requested a transfer after payment.
     */
    public function transfer(
        Enrolment $oldEnrolment,
        Course $newCourse,
        User $admin,
        ?CourseSection $newSection = null,
        ?string $note = null
    ): Enrolment {
        if ($oldEnrolment->status !== EnrolmentStatus::TransferRequested) {
            throw ValidationException::withMessages(['status' => 'This enrolment does not have a pending transfer request.']);
        }

        // Check seat capacity on the new course/section using the same logic as normal enrollment
        $section = null;
        $status = EnrolmentStatus::Confirmed;

        if ($newSection !== null) {
            if ($newSection->course_id !== $newCourse->id) {
                throw ValidationException::withMessages(['section_id' => 'This section does not belong to the specified course.']);
            }

            $section = CourseSection::where('id', $newSection->id)
                ->where('course_id', $newCourse->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Validate section is in acceptable status
            if ($section->status === CourseSectionStatus::Draft) {
                throw ValidationException::withMessages(['section_id' => 'This section is not yet open for enrollment.']);
            }

            if ($section->status === CourseSectionStatus::Closed) {
                throw ValidationException::withMessages(['section_id' => 'This section is closed for enrollment.']);
            }

            // Check capacity - if full, reject transfer
            if ($section->capacity !== null && $section->seats_taken >= $section->capacity) {
                throw ValidationException::withMessages(['section_id' => 'This section has no free seats.']);
            }
        } else {
            // No section provided - check if course requires sections
            if ($newCourse->sections_required) {
                $hasActiveSections = $newCourse->sections()
                    ->whereNotIn('status', [CourseSectionStatus::Draft, CourseSectionStatus::Completed])
                    ->exists();

                if ($hasActiveSections) {
                    throw ValidationException::withMessages(['section_id' => 'This course requires enrollment in a specific section.']);
                }
            }

            // Check for duplicate self-paced enrollment
            $existingSelfPacedEnrolment = Enrolment::where('student_id', $oldEnrolment->student_id)
                ->where('course_id', $newCourse->id)
                ->whereNull('section_id')
                ->where('status', EnrolmentStatus::Confirmed)
                ->exists();

            if ($existingSelfPacedEnrolment) {
                throw ValidationException::withMessages(['course_id' => 'The student is already enrolled in this course.']);
            }
        }

        return DB::transaction(function () use ($oldEnrolment, $newCourse, $admin, $section, $note, $status) {
            $student = $oldEnrolment->student;
            $oldOrder = $oldEnrolment->order;

            // Create new enrolment
            $newEnrolment = Enrolment::create([
                'student_id' => $student->id,
                'course_id' => $newCourse->id,
                'section_id' => $section?->id,
                'status' => $status,
                'source' => EnrolmentSource::Transfer,
                'applied_at' => Carbon::now(),
                'confirmation_email_due_at' => Carbon::now()->addHours($newCourse->confirmation_delay_hours),
            ]);

            // Increment seats_taken if section and confirmed
            if ($section !== null && $status === EnrolmentStatus::Confirmed) {
                $section->increment('seats_taken');
            }

            // Reassign the existing order to the new enrolment
            if ($oldOrder !== null) {
                $oldOrder->update([
                    'enrolment_id' => $newEnrolment->id,
                    'course_id' => $newCourse->id,
                    'transferred_from_enrolment_id' => $oldEnrolment->id,
                ]);
            }

            // Mark old enrolment as transferred (do NOT release old seat - that's for refunds only)
            $oldEnrolment->update([
                'status' => EnrolmentStatus::Transferred,
                'transferred_to_id' => $newEnrolment->id,
                'withdrawal_note' => $note,
            ]);

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
                    'old_section_id' => $oldEnrolment->section_id,
                    'new_section_id' => $section?->id,
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

            // Release section seat and promote waitlist (reuse existing logic)
            $this->releaseSectionSeatAndPromoteWaitlist($enrolment);

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
                    'section_id' => $enrolment->section_id,
                    'note' => $note,
                ],
            );

            // Notify the student
            $this->notifyStudentOfRefund($enrolment->student, $enrolment, $refundAmount, $note);

            return $enrolment->fresh();
        });
    }

    /**
     * Release section seat and promote waitlisted student (shared logic).
     * Extracted from withdrawDirectly to avoid duplication.
     */
    private function releaseSectionSeatAndPromoteWaitlist(Enrolment $enrolment): void
    {
        if ($enrolment->section_id !== null) {
            $section = CourseSection::where('id', $enrolment->section_id)
                ->lockForUpdate()
                ->first();

            if ($section) {
                $section->decrement('seats_taken');

                // Promote oldest waitlisted enrollment
                $waitlisted = Enrolment::where('section_id', $section->id)
                    ->where('status', EnrolmentStatus::Waitlisted)
                    ->orderBy('created_at', 'asc')
                    ->lockForUpdate()
                    ->first();

                if ($waitlisted) {
                    $this->promoteFromWaitlist($waitlisted, $section);
                }
            }
        }
    }

    /**
     * Promote a waitlisted enrollment to confirmed status.
     * Shared method from EnrolmentService.
     */
    private function promoteFromWaitlist(Enrolment $enrolment, CourseSection $section): void
    {
        $enrolment->update(['status' => EnrolmentStatus::Confirmed]);

        $section->increment('seats_taken');

        // Create order for the promoted student
        Order::create([
            'student_id' => $enrolment->student_id,
            'course_id' => $enrolment->course_id,
            'enrolment_id' => $enrolment->id,
            'amount' => $enrolment->course->price,
            'currency' => $enrolment->course->currency,
            'status' => \App\Enums\OrderStatus::Pending,
        ]);

        $this->auditLogger->log(
            action: 'enrolment.promoted_from_waitlist',
            entityType: 'enrolment',
            entityId: $enrolment->id,
            actorId: $enrolment->student_id,
            meta: ['course_id' => $enrolment->course_id, 'section_id' => $section->id],
        );

        // Send notification about promotion
        $this->notificationDispatcher->notify(
            user: $enrolment->student,
            type: 'waitlist_promoted',
            title: "You've been enrolled in {$enrolment->course->title}",
            body: "A seat opened up in {$section->name} and you've been promoted from the waitlist.",
            relatedEntityType: 'enrolment',
            relatedEntityId: $enrolment->id,
        );

        // Queue confirmation email
        \App\Jobs\SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
            ->delay($enrolment->confirmation_email_due_at);

        // Initialize progress
        $this->progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
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