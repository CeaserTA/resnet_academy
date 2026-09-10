<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseSectionStatus;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AttachCourseToCohortRequest extends FormRequest
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
            'course_id' => [
                'required',
                'integer',
                'exists:courses,id',
                Rule::unique('cohort_courses', 'course_id')->where('cohort_id', $this->route('cohort')?->id),
            ],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::enum(CourseSectionStatus::class)],
            'primary_instructor_id' => ['nullable', 'exists:users,id'],
            'price_override' => ['nullable', 'numeric', 'min:0'],
            'currency_override' => ['nullable', 'string', 'size:3'],
        ];
    }

    public function messages(): array
    {
        return [
            'course_id.unique' => 'This course is already offered in this cohort.',
            'capacity.min' => 'Capacity must be at least 1.',
        ];
    }
}
