<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCourseApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === UserRole::Student;
    }

    public function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', Rule::exists('courses', 'id')->where('status', 'published')],
            // The section must belong to the course being applied to — a valid section id for a
            // different course is rejected here instead of blowing up deep inside enrol().
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('course_sections', 'id')->where('course_id', $this->integer('course_id')),
            ],
            'answers' => ['nullable', 'array'],
            'answers.*' => ['string', 'max:2000'],
            // Courses can demand a portfolio link — enforce it server-side, not just in the modal.
            'portfolio_url' => [
                Rule::requiredIf(fn (): bool => $this->courseRequiresPortfolio()),
                'nullable',
                'url',
                'max:500',
            ],
            'alternative_proof_text' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function courseRequiresPortfolio(): bool
    {
        $courseId = $this->integer('course_id');

        if ($courseId <= 0) {
            return false;
        }

        return (bool) Course::query()->whereKey($courseId)->value('application_require_portfolio_url');
    }
}
