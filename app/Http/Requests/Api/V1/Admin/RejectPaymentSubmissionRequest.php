<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class RejectPaymentSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', User::class);
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
