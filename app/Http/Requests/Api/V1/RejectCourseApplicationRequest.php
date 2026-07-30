<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\CourseApplication;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RejectCourseApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('reject', CourseApplication::class);
    }

    public function rules(): array
    {
        return [
            'recommended_course_ids' => ['nullable', 'array'],
            'recommended_course_ids.*' => [Rule::exists('courses', 'id')],
        ];
    }
}
