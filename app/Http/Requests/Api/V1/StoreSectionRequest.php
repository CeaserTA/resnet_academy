<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseSectionStatus;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Admin || $this->user()?->role === UserRole::Instructor;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'application_deadline' => ['nullable', 'date', 'before:start_date'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::enum(CourseSectionStatus::class)],
            'primary_instructor_id' => ['nullable', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'end_date.after' => 'End date must be after start date.',
            'application_deadline.before' => 'Application deadline must be before section start date.',
            'capacity.min' => 'Capacity must be at least 1.',
        ];
    }
}
