<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseSectionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('update', $this->route('section'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $section = $this->route('section');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'application_deadline' => ['nullable', 'date', 'before:start_date'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::enum(CourseSectionStatus::class)],
            'primary_instructor_id' => ['nullable', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'end_date.after' => 'End date must be after start date.',
            'application_deadline.before' => 'Application deadline must be before section start date.',
            'capacity.min' => 'Capacity must be at least 0.',
        ];
    }

    /**
     * Additional validation after standard rules pass.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $section = $this->route('section');

            // Validate status transitions
            if ($this->has('status')) {
                $currentStatus = $section->status;
                $newStatus = CourseSectionStatus::from($this->input('status'));

                if (! $this->isValidStatusTransition($currentStatus, $newStatus)) {
                    $validator->errors()->add(
                        'status',
                        "Cannot transition from {$currentStatus->value} to {$newStatus->value}."
                    );
                }
            }
        });
    }

    private function isValidStatusTransition(CourseSectionStatus $from, CourseSectionStatus $to): bool
    {
        // Allow staying in same status
        if ($from === $to) {
            return true;
        }

        // Define allowed transitions
        $allowed = [
            CourseSectionStatus::Draft->value => [CourseSectionStatus::Open->value],
            CourseSectionStatus::Open->value => [CourseSectionStatus::InProgress->value, CourseSectionStatus::Closed->value],
            CourseSectionStatus::InProgress->value => [CourseSectionStatus::Completed->value],
            CourseSectionStatus::Closed->value => [CourseSectionStatus::Open->value], // Allow reopening
            CourseSectionStatus::Completed->value => [], // Terminal state
        ];

        return in_array($to->value, $allowed[$from->value] ?? [], true);
    }
}
