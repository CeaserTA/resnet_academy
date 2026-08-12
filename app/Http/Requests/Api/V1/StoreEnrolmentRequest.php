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
            'section_id' => ['nullable', 'integer', 'exists:course_sections,id'],
        ];
    }
}
