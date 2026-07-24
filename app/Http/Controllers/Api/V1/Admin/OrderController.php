<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Payments management: every order across every student, unlike `EnrolmentController::index()`
 * which is scoped to the authenticated student's own rows. Same admin-only gate as the other
 * `/admin/*` read endpoints.
 */
final class OrderController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * `?status=` maps to a tab, not a raw column match — a "pending" (Receivables) row is either
     * an untouched order or one currently holding a pending payment submission (regardless of its
     * last-*confirmed* status), while "partial"/"paid" explicitly exclude orders that currently
     * have one, since those need to reappear under Receivables until the admin resolves them.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $hasPendingSubmission = fn ($query) => $query->where('status', PaymentSubmissionStatus::Pending);

        $orders = Order::query()
            ->when($request->filled('status'), function ($query) use ($request, $hasPendingSubmission) {
                $status = $request->string('status')->toString();

                if ($status === OrderStatus::Pending->value) {
                    $query->where(fn ($q) => $q->where('status', OrderStatus::Pending)->orWhereHas('paymentSubmissions', $hasPendingSubmission));
                } else {
                    $query->where('status', $status)->whereDoesntHave('paymentSubmissions', $hasPendingSubmission);
                }
            })
            ->with(['student', 'course', 'paymentSubmissions'])
            ->latest('id')
            ->paginate(50);

        return OrderResource::collection($orders);
    }

    /**
     * Records a payment against the order rather than accepting a status directly — `status`
     * is always derived here from comparing the new `amount_paid` to `amount`, so it can never
     * disagree with the numbers. Overpayment clamps to the order's `amount` rather than going
     * negative on the remaining balance. Always audited, same pattern as
     * `Admin\UserController::update()`'s role/status changes.
     */
    public function update(UpdateOrderRequest $request, Order $order): OrderResource
    {
        $amountPaid = min((float) $request->validated('amount_paid'), (float) $order->amount);
        $status = $order->deriveStatus($amountPaid);

        $previousAmountPaid = $order->amount_paid;

        $order->update([
            'amount_paid' => $amountPaid,
            'status' => $status,
            'payment_method' => $request->has('payment_method') ? $request->validated('payment_method') : $order->payment_method,
            'paid_at' => $status === OrderStatus::Paid ? ($order->paid_at ?? now()) : $order->paid_at,
        ]);

        if ((float) $previousAmountPaid !== $amountPaid) {
            $this->auditLogger->log(
                action: 'order.payment_recorded',
                entityType: 'order',
                entityId: $order->id,
                actorId: $request->user()->id,
                meta: ['from' => (float) $previousAmountPaid, 'to' => $amountPaid, 'status' => $status->value],
            );
        }

        return new OrderResource($order->fresh(['student', 'course']));
    }
}
