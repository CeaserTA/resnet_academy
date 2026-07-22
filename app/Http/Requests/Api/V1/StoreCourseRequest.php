<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

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
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
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
