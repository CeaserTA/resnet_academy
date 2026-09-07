<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Exceptions\EnrolmentAlreadyHasPendingTransferException;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-2/FR-3: every application auto-confirms, no eligibility gate. The only asynchronous
 * part is the per-course confirmation email delay.
 *
 * Every enrolment belongs to a specific course-within-a-cohort (`CohortCourse`) — there is no
 * self-paced mode. Enrolments may be waitlisted if that offering's capacity is reached.
 */
final class EnrolmentService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
    ) {}

    /**
     * Enroll a student in a course-within-a-cohort.
     *
     * Uses pessimistic locking (SELECT ... FOR UPDATE) on the cohort_course row to prevent
     * race conditions when checking/incrementing seats_taken.
     */
    public function enrol(User $student, Course $course, EnrolmentSource $source, int $cohortCourseId, ?User $importedBy = null): Enrolment
    {
        return DB::transaction(function () use ($student, $course, $source, $cohortCourseId, $importedBy) {
            $appliedAt = Carbon::now();

            $cohortCourse = CohortCourse::where('id', $cohortCourseId)
                ->where('course_id', $course->id)
                ->lockForUpdate()
                ->firstOrFail();

            $status = match ($cohortCourse->status) {
                CourseSectionStatus::Open => EnrolmentStatus::Confirmed,
                CourseSectionStatus::Draft => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort is not yet open for enrollment.']),
                CourseSectionStatus::Closed => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort is closed for enrollment.']),
                CourseSectionStatus::InProgress => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort has already started and is no longer accepting enrollments.']),
                CourseSectionStatus::Completed => throw ValidationException::withMessages(['cohort_course_id' => 'This cohort has already completed.']),
            };

            // Check capacity - if full, create as waitlisted
            if ($cohortCourse->capacity !== null && $cohortCourse->seats_taken >= $cohortCourse->capacity) {
                $status = EnrolmentStatus::Waitlisted;
            }

            // Create the enrollment
            $enrolment = Enrolment::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'cohort_course_id' => $cohortCourse->id,
                'status' => $status,
                'source' => $source,
                'imported_by' => $importedBy?->id,
                'applied_at' => $appliedAt,
                'confirmation_email_due_at' => $appliedAt->clone()->addHours($course->confirmation_delay_hours),
            ]);

            // Only increment seats_taken and create order if confirmed (not waitlisted)
            if ($status === EnrolmentStatus::Confirmed) {
                $cohortCourse->increment('seats_taken');

                [$amount, $currency] = $cohortCourse->resolvedPrice();

                Order::create([
                    'student_id' => $student->id,
                    'course_id' => $course->id,
                    'enrolment_id' => $enrolment->id,
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => OrderStatus::Pending,
                ]);

                $this->auditLogger->log(
                    action: 'enrolment.confirmed',
                    entityType: 'enrolment',
                    entityId: $enrolment->id,
                    // @phpstan-ignore nullsafe.neverNull (false positive: $importedBy is null for self-enrolment)
                    actorId: $importedBy?->id ?? $student->id,
                    meta: ['course_id' => $course->id, 'cohort_course_id' => $cohortCourse->id, 'source' => $source->value],
                );

                // afterCommit(): dispatched inside this transaction, so on a non-database queue
                // driver a worker could otherwise pick this up before the enrolment row commits.
                SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
                    ->delay($enrolment->confirmation_email_due_at)
                    ->afterCommit();

                $this->progressEngine->evaluateCourseUnlocks($student, $course);
            } else {
                // Waitlisted
                $this->auditLogger->log(
                    action: 'enrolment.waitlisted',
                    entityType: 'enrolment',
                    entityId: $enrolment->id,
                    // @phpstan-ignore nullsafe.neverNull (same false positive as the confirmed branch above)
                    actorId: $importedBy?->id ?? $student->id,
                    meta: ['course_id' => $course->id, 'cohort_course_id' => $cohortCourse->id, 'source' => $source->value],
                );
            }

            return $enrolment;
        });
    }

    /**
     * Withdraw an enrollment. Branches on payment status - unpaid enrollments withdraw directly,
     * paid enrollments create a transfer request for admin mediation.
     *
     * architecture.md §7 / ai-workflow-rules.md §9: enrolment status changes are one of the
     * three sensitive-mutation categories that must always be audited.
     */
    public function withdraw(Enrolment $enrolment, User $actor, ?string $note = null): Enrolment
    {
        // Load order if not already loaded
        if (! $enrolment->relationLoaded('order')) {
            $enrolment->load('order');
        }

        $order = $enrolment->order;

        // If no order or no payment made, withdraw directly
        if ($order === null || (float) $order->amount_paid <= 0) {
            return $this->withdrawDirectly($enrolment, $actor);
        }

        // Payment has been made - create transfer request
        if ($enrolment->status === EnrolmentStatus::TransferRequested) {
            throw new EnrolmentAlreadyHasPendingTransferException();
        }

        return DB::transaction(function () use ($enrolment, $actor, $note) {
            $previousStatus = $enrolment->status;

            $enrolment->update([
                'status' => EnrolmentStatus::TransferRequested,
                'transfer_requested_at' => now(),
                'withdrawal_note' => $note,
            ]);

            $this->auditLogger->log(
                action: 'enrolment.transfer_requested',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => EnrolmentStatus::TransferRequested->value,
                    'cohort_course_id' => $enrolment->cohort_course_id,
                    'note' => $note,
                ],
            );

            $this->notifyAdminsOfTransferRequest($enrolment);

            return $enrolment->fresh();
        });
    }

    /**
     * Direct withdrawal for unpaid enrollments - sets status to Withdrawn, releases capacity,
     * and promotes waitlisted students.
     */
    private function withdrawDirectly(Enrolment $enrolment, User $actor): Enrolment
    {
        return DB::transaction(function () use ($enrolment, $actor) {
            $previousStatus = $enrolment->status;

            $enrolment->update(['status' => EnrolmentStatus::Withdrawn]);

            $this->auditLogger->log(
                action: 'enrolment.status_changed',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => EnrolmentStatus::Withdrawn->value,
                    'cohort_course_id' => $enrolment->cohort_course_id,
                ],
            );

            // If this was a confirmed enrollment, release the seat and promote the waitlist.
            if ($previousStatus === EnrolmentStatus::Confirmed) {
                $this->releaseSeatAndPromoteWaitlist($enrolment);
            }

            return $enrolment->fresh();
        });
    }

    /**
     * Release the seat held by a confirmed enrolment and promote the oldest waitlisted
     * student for the same cohort_course, if any. Shared by direct (unpaid) withdrawal here
     * and by `EnrolmentTransferService::refund()`/`transfer()`.
     */
    public function releaseSeatAndPromoteWaitlist(Enrolment $enrolment): void
    {
        $cohortCourse = CohortCourse::where('id', $enrolment->cohort_course_id)
            ->lockForUpdate()
            ->first();

        if ($cohortCourse === null) {
            return;
        }

        $cohortCourse->decrement('seats_taken');

        $waitlisted = Enrolment::where('cohort_course_id', $cohortCourse->id)
            ->where('status', EnrolmentStatus::Waitlisted)
            ->orderBy('created_at', 'asc')
            ->lockForUpdate()
            ->first();

        if ($waitlisted) {
            $this->promoteFromWaitlist($waitlisted, $cohortCourse);
        }
    }

    /**
     * Notify admins of a new transfer request.
     */
    private function notifyAdminsOfTransferRequest(Enrolment $enrolment): void
    {
        $this->notificationDispatcher->notifyAdminsOfTransferRequest($enrolment);
    }

    /**
     * Cancel a pending transfer request, reverting to Confirmed status.
     */
    public function cancelTransferRequest(Enrolment $enrolment, User $actor): Enrolment
    {
        if ($enrolment->status !== EnrolmentStatus::TransferRequested) {
            throw ValidationException::withMessages(['status' => 'This enrolment does not have a pending transfer request.']);
        }

        return DB::transaction(function () use ($enrolment, $actor) {
            $previousStatus = $enrolment->status;

            $enrolment->update([
                'status' => EnrolmentStatus::Confirmed,
                'transfer_requested_at' => null,
                'withdrawal_note' => null,
            ]);

            $this->auditLogger->log(
                action: 'enrolment.transfer_request_cancelled',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => EnrolmentStatus::Confirmed->value,
                    'cohort_course_id' => $enrolment->cohort_course_id,
                ],
            );

            return $enrolment->fresh();
        });
    }

    /**
     * Admin-driven status change between the lifecycle states. Withdrawals delegate to
     * withdraw() so seat release + waitlist promotion still happen; confirming re-runs the
     * cohort_course capacity check and the confirmed side-effects (order, email, progress eval).
     */
    public function changeStatus(Enrolment $enrolment, EnrolmentStatus $newStatus, User $actor): Enrolment
    {
        if ($enrolment->status === $newStatus) {
            return $enrolment;
        }

        if ($newStatus === EnrolmentStatus::Withdrawn) {
            return $this->withdraw($enrolment, $actor, null);
        }

        // Transfer-related statuses should go through the dedicated transfer methods
        if ($newStatus === EnrolmentStatus::TransferRequested) {
            throw ValidationException::withMessages(['status' => 'Use the withdraw method to request a transfer.']);
        }

        if ($newStatus === EnrolmentStatus::Transferred) {
            throw ValidationException::withMessages(['status' => 'Use the dedicated transfer methods to handle transfers.']);
        }

        return DB::transaction(function () use ($enrolment, $newStatus, $actor) {
            $previousStatus = $enrolment->status;

            if ($newStatus === EnrolmentStatus::Confirmed) {
                $cohortCourse = CohortCourse::where('id', $enrolment->cohort_course_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($cohortCourse->capacity !== null && $cohortCourse->seats_taken >= $cohortCourse->capacity) {
                    throw ValidationException::withMessages([
                        'status' => 'This cohort has no free seats. Increase its capacity before confirming.',
                    ]);
                }

                $enrolment->update(['status' => EnrolmentStatus::Confirmed]);

                $cohortCourse->increment('seats_taken');

                // Waitlisted enrolments never got an order — create it on confirmation.
                if (! $enrolment->order()->exists()) {
                    [$amount, $currency] = $cohortCourse->resolvedPrice();

                    Order::create([
                        'student_id' => $enrolment->student_id,
                        'course_id' => $enrolment->course_id,
                        'enrolment_id' => $enrolment->id,
                        'amount' => $amount,
                        'currency' => $currency,
                        'status' => OrderStatus::Pending,
                    ]);
                }

                // afterCommit(): see the note on the same call in enrol() above.
                SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
                    ->delay($enrolment->confirmation_email_due_at)
                    ->afterCommit();

                $this->progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
            } else {
                // Demotion to waitlisted — release the seat if one was held.
                if ($previousStatus === EnrolmentStatus::Confirmed) {
                    $cohortCourse = CohortCourse::where('id', $enrolment->cohort_course_id)
                        ->lockForUpdate()
                        ->first();

                    $cohortCourse?->decrement('seats_taken');
                }

                $enrolment->update(['status' => EnrolmentStatus::Waitlisted]);
            }

            $this->auditLogger->log(
                action: 'enrolment.status_changed',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => $newStatus->value,
                    'cohort_course_id' => $enrolment->cohort_course_id,
                ],
            );

            return $enrolment->fresh();
        });
    }

    /**
     * Promote a waitlisted enrollment to confirmed status.
     * Creates order, queues confirmation email, initializes progress.
     *
     * Public method - can be called by EnrolmentService itself (waitlist release paths) or
     * CohortCourseService::update() (capacity increase).
     */
    public function promoteFromWaitlist(Enrolment $enrolment, CohortCourse $cohortCourse): void
    {
        $enrolment->update(['status' => EnrolmentStatus::Confirmed]);

        $cohortCourse->increment('seats_taken');

        [$amount, $currency] = $cohortCourse->resolvedPrice();

        // Create order for the promoted student
        Order::create([
            'student_id' => $enrolment->student_id,
            'course_id' => $enrolment->course_id,
            'enrolment_id' => $enrolment->id,
            'amount' => $amount,
            'currency' => $currency,
            'status' => OrderStatus::Pending,
        ]);

        $this->auditLogger->log(
            action: 'enrolment.promoted_from_waitlist',
            entityType: 'enrolment',
            entityId: $enrolment->id,
            actorId: $enrolment->student_id,
            meta: ['course_id' => $enrolment->course_id, 'cohort_course_id' => $cohortCourse->id],
        );

        // Send notification about promotion
        $this->notificationDispatcher->notify(
            user: $enrolment->student,
            type: 'waitlist_promoted',
            title: "You've been enrolled in {$enrolment->course->title}",
            body: "A seat opened up in {$cohortCourse->cohort->name} and you've been promoted from the waitlist.",
            relatedEntityType: 'enrolment',
            relatedEntityId: $enrolment->id,
        );

        // Queue confirmation email (afterCommit(): see the note in enrol() above — this method
        // relies on running inside a caller's transaction, so deferring to that transaction's
        // commit matters here too).
        SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
            ->delay($enrolment->confirmation_email_due_at)
            ->afterCommit();

        // Initialize progress
        $this->progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
    }
}
