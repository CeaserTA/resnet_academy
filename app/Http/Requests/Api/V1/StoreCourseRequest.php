<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseLevel;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Course::class);
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')],
            'title' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', 'alpha_dash', Rule::unique('courses', 'slug')],
            'description' => ['nullable', 'string'],
            'level' => ['required', new Enum(CourseLevel::class)],
            // Optional, not required: CourseController::store() defaults it from the level
            // (matching the admin form's own default) when a caller omits it entirely.
            'enrolment_policy' => ['sometimes', new Enum(CourseEnrolmentPolicy::class)],
            'advisory_require_attestation' => ['nullable', 'boolean'],
            'application_questions' => ['nullable', 'array', 'max:10'],
            'application_questions.*' => ['string', 'max:300'],
            'application_allow_alternative_proof' => ['nullable', 'boolean'],
            'application_require_portfolio_url' => ['nullable', 'boolean'],
            // Either paste a URL or upload an image — 'thumbnail' takes precedence when both are
            // present (see CourseController::store()).
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'prerequisites_text' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'confirmation_delay_hours' => ['nullable', 'integer', 'min:0'],
            'schedule_start_date' => ['nullable', 'date'],
            'instructor_ids' => ['nullable', 'array'],
            'instructor_ids.*' => [Rule::exists('users', 'id')->where('role', 'instructor')],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('title')) {
            $this->merge(['slug' => Str::slug((string) $this->input('title'))]);
        }
    }
}
