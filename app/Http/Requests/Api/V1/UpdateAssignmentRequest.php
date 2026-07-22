<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\AssignmentSubmissionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class UpdateAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('assignment'));
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'instructions' => ['nullable', 'string'],
            'submission_type' => ['sometimes', 'required', new Enum(AssignmentSubmissionType::class)],
            'due_at' => ['nullable', 'date'],
            'allow_late' => ['sometimes', 'boolean'],
            'late_penalty_policy_id' => ['nullable', 'integer', Rule::exists('late_penalty_policies', 'id')],
            'max_score' => ['sometimes', 'numeric', 'min:0'],
            'plagiarism_check_enabled' => ['sometimes', 'boolean'],
            'is_required' => ['sometimes', 'boolean'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
            'rubrics' => ['nullable', 'array'],
            'rubrics.*.criterion' => ['required_with:rubrics', 'string', 'max:200'],
            'rubrics.*.max_points' => ['required_with:rubrics', 'numeric', 'min:0'],
        ];
    }
}
