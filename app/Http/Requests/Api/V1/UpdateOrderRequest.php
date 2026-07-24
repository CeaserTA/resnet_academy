<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `status` is never accepted here — it's always derived server-side
 * (`Admin\OrderController::update()`) from comparing `amount_paid` to the order's `amount`, so
 * the data can never say "paid" while an amount is still owed.
 */
final class UpdateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', User::class);
    }

    public function rules(): array
    {
        return [
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }
}
