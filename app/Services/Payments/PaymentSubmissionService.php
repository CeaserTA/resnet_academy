<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * A student's claimed payment sits `pending` until an admin confirms it (applied to the order)
 * or rejects it (order untouched, student may resubmit) — see `Admin\PaymentSubmissionController`.
 */
final class PaymentSubmissionService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly MediaStorageService $mediaStorage,
        private readonly NotificationDispatcher $notificationDispatcher,
    ) {}

    public function submit(Order $order, float $amount, UploadedFile $receipt): PaymentSubmission
    {
        // Upload before opening the transaction: object storage isn't transactional with the DB
        // either way, and doing it first means a rejected/failed upload never opens a transaction
        // at all, matching the previous ordering.
        $path = $this->mediaStorage->store($receipt, "payment-receipts/{$order->id}");

        $submission = DB::transaction(function () use ($order, $amount, $receipt, $path): PaymentSubmission {
            // Lock the order row for the duration of the "no pending submission" and "amount
            // within remaining balance" checks: without this, two concurrent submissions for the
            // same order can both read the same amount_paid/no-pending-submission state and both
            // be created, together exceeding the order's remaining balance.
            $order = $order->newQuery()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            abort_if(
                $order->paymentSubmissions()->where('status', PaymentSubmissionStatus::Pending)->exists(),
                422,
                'A payment for this order is already awaiting confirmation.',
            );

            $remainingBalance = round((float) $order->amount - (float) $order->amount_paid, 2);

            abort_if($remainingBalance <= 0, 422, 'This order has already been paid in full.');

            abort_if(
                $amount > $remainingBalance,
                422,
                'You can\'t pay more than the remaining balance for this course.',
            );

            return PaymentSubmission::create([
                'order_id' => $order->id,
                'amount' => $amount,
                'receipt_path' => $path,
                'receipt_original_name' => $receipt->getClientOriginalName(),
                'status' => PaymentSubmissionStatus::Pending,
            ]);
        });

        $this->notificationDispatcher->notifyAdminsOfPaymentSubmitted($submission->fresh(['order.student', 'order.course']));

        return $submission;
    }

    public function confirm(PaymentSubmission $submission, User $admin): PaymentSubmission
    {
        $submission = DB::transaction(function () use ($submission, $admin): PaymentSubmission {
            // Re-fetch and lock both rows inside the transaction: confirm() previously read
            // order.amount_paid with no lock, so a concurrent confirm() on another pending
            // submission for the same order (or a manual edit via Admin\OrderController::update())
            // could compute amount_paid from the same stale value and silently clobber it.
            $submission = $submission->newQuery()->whereKey($submission->id)->lockForUpdate()->firstOrFail();

            abort_if($submission->status !== PaymentSubmissionStatus::Pending, 422, 'This payment has already been reviewed.');

            $order = $submission->order()->lockForUpdate()->firstOrFail();
            $previousAmountPaid = $order->amount_paid;
            $amountPaid = min((float) $order->amount_paid + (float) $submission->amount, (float) $order->amount);
            $status = $order->deriveStatus($amountPaid);

            $order->update([
                'amount_paid' => $amountPaid,
                'status' => $status,
                'paid_at' => $status === OrderStatus::Paid ? ($order->paid_at ?? now()) : $order->paid_at,
            ]);

            $submission->update([
                'status' => PaymentSubmissionStatus::Confirmed,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.payment_confirmed',
                entityType: 'order',
                entityId: $order->id,
                actorId: $admin->id,
                meta: ['from' => (float) $previousAmountPaid, 'to' => $amountPaid, 'status' => $status->value, 'submission_id' => $submission->id],
            );

            return $submission;
        });

        $submission = $submission->fresh(['order.student', 'order.course']);
        $this->notificationDispatcher->notifyStudentOfPaymentConfirmed($submission);

        return $submission;
    }

    public function reject(PaymentSubmission $submission, User $admin, ?string $reason = null): PaymentSubmission
    {
        DB::transaction(function () use ($submission, $admin, $reason): void {
            $submission = $submission->newQuery()->whereKey($submission->id)->lockForUpdate()->firstOrFail();

            abort_if($submission->status !== PaymentSubmissionStatus::Pending, 422, 'This payment has already been reviewed.');

            $submission->update([
                'status' => PaymentSubmissionStatus::Rejected,
                'rejection_reason' => $reason,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.payment_rejected',
                entityType: 'order',
                entityId: $submission->order_id,
                actorId: $admin->id,
                meta: ['submission_id' => $submission->id, 'amount' => (float) $submission->amount, 'reason' => $reason],
            );
        });

        $submission = $submission->fresh(['order.student', 'order.course']);
        $this->notificationDispatcher->notifyStudentOfPaymentRejected($submission);

        return $submission;
    }
}
