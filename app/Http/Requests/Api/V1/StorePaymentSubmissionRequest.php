<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

final class StorePaymentSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Order $order */
        $order = $this->route('order');

        return $this->user()->can('submitPayment', $order);
    }

    /**
     * Only field-level shape is checked here — the "can't exceed the remaining balance" /
     * "not while one is already pending" business rules live in
     * `PaymentSubmissionService::submit()` (`abort_if`, same pattern as
     * `EvaluationAttemptService`/`ConversationService`), since they need the order's current
     * state, not just this request's own fields.
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'receipt' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ];
    }
}
