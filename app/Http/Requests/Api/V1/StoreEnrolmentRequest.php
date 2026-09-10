<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Enrolment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreEnrolmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Enrolment::class);
    }

    public function rules(): array
    {
        return [
            'course_id' => [
                'required',
                'integer',
                Rule::exists('courses', 'id')->where('status', 'published'),
            ],
            // Scoped to the same course_id — mirrors StoreCourseApplicationRequest — so a
            // mismatched pair fails validation with a clean 422 instead of falling through to
            // EnrolmentService::enrol()'s firstOrFail() 404.
            'cohort_course_id' => [
                'required',
                'integer',
                Rule::exists('cohort_courses', 'id')->where('course_id', $this->integer('course_id')),
            ],
        ];
    }
}
