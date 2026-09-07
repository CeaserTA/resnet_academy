<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateCohortRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Admin;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:200'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'application_deadline' => ['nullable', 'date', 'before:start_date'],
            'status' => ['sometimes', 'in:draft,published,archived'],
        ];
    }

    public function messages(): array
    {
        return [
            'end_date.after' => 'End date must be after start date.',
            'application_deadline.before' => 'Application deadline must be before the cohort start date.',
        ];
    }
}
