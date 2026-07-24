<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\CourseLevel;
use App\Enums\CourseStatus;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('course'));
    }

    public function rules(): array
    {
        /** @var Course $course */
        $course = $this->route('course');

        return [
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')],
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'slug' => ['sometimes', 'required', 'string', 'max:220', 'alpha_dash', Rule::unique('courses', 'slug')->ignore($course->id)],
            'description' => ['nullable', 'string'],
            'level' => ['sometimes', 'required', new Enum(CourseLevel::class)],
            // Either paste a URL or upload an image — 'thumbnail' takes precedence when both are
            // present (see CourseController::update()).
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'prerequisites_text' => ['nullable', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['sometimes', 'required', new Enum(CourseStatus::class)],
            'confirmation_delay_hours' => ['nullable', 'integer', 'min:0'],
            'schedule_start_date' => ['nullable', 'date'],
            'instructor_ids' => ['nullable', 'array'],
            'instructor_ids.*' => [Rule::exists('users', 'id')->where('role', 'instructor')],
            'change_summary' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
