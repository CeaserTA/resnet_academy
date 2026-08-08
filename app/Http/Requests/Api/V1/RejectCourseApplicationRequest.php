<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RejectCourseApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('reject', $this->route('application'));
    }

    public function rules(): array
    {
        return [
            'recommended_course_ids' => ['nullable', 'array'],
            'recommended_course_ids.*' => [Rule::exists('courses', 'id')],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
