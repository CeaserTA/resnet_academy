<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\UploadedFile;

/**
 * A student's claimed payment sits `pending` until an admin confirms it (applied to the order)
 * or rejects it (order untouched, student may resubmit) — see `Admin\PaymentSubmissionController`.
 */
final class PaymentSubmissionService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    public function submit(Order $order, float $amount, UploadedFile $receipt): PaymentSubmission
    {
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

        $path = $this->mediaStorage->store($receipt, "payment-receipts/{$order->id}");

        return PaymentSubmission::create([
            'order_id' => $order->id,
            'amount' => $amount,
            'receipt_path' => $path,
            'receipt_original_name' => $receipt->getClientOriginalName(),
            'status' => PaymentSubmissionStatus::Pending,
        ]);
    }

    public function confirm(PaymentSubmission $submission, User $admin): PaymentSubmission
    {
        abort_if($submission->status !== PaymentSubmissionStatus::Pending, 422, 'This payment has already been reviewed.');

        $order = $submission->order;
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

        return $submission->fresh(['order']);
    }

    public function reject(PaymentSubmission $submission, User $admin): PaymentSubmission
    {
        abort_if($submission->status !== PaymentSubmissionStatus::Pending, 422, 'This payment has already been reviewed.');

        $submission->update([
            'status' => PaymentSubmissionStatus::Rejected,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $this->auditLogger->log(
            action: 'order.payment_rejected',
            entityType: 'order',
            entityId: $submission->order_id,
            actorId: $admin->id,
            meta: ['submission_id' => $submission->id, 'amount' => (float) $submission->amount],
        );

        return $submission->fresh(['order']);
    }
}
