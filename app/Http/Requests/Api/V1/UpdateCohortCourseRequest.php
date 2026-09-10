<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseSectionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCohortCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('update', $this->route('cohortCourse'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'capacity' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::enum(CourseSectionStatus::class)],
            'primary_instructor_id' => ['nullable', 'exists:users,id'],
            'price_override' => ['nullable', 'numeric', 'min:0'],
            'currency_override' => ['nullable', 'string', 'size:3'],
        ];
    }

    public function messages(): array
    {
        return [
            'capacity.min' => 'Capacity must be at least 0.',
        ];
    }

    /**
     * Same status-transition FSM the old UpdateSectionRequest enforced, unchanged — status
     * still lives on the cohort_course row (per-offering), not the cohort itself.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $cohortCourse = $this->route('cohortCourse');

            if ($this->has('status')) {
                $currentStatus = $cohortCourse->status;
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
        if ($from === $to) {
            return true;
        }

        $allowed = [
            CourseSectionStatus::Draft->value => [CourseSectionStatus::Open->value],
            CourseSectionStatus::Open->value => [CourseSectionStatus::InProgress->value, CourseSectionStatus::Closed->value],
            CourseSectionStatus::InProgress->value => [CourseSectionStatus::Completed->value],
            CourseSectionStatus::Closed->value => [CourseSectionStatus::Open->value],
            CourseSectionStatus::Completed->value => [],
        ];

        return in_array($to->value, $allowed[$from->value] ?? [], true);
    }
}
