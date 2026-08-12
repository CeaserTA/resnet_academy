<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
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
            'section_id' => ['nullable', 'integer', 'exists:course_sections,id'],
            'answers' => ['nullable', 'array'],
            'answers.*' => ['string', 'max:2000'],
            'portfolio_url' => ['nullable', 'url', 'max:500'],
            'alternative_proof_text' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
