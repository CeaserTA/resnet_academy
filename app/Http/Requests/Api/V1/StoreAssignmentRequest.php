<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\AssignmentSubmissionType;
use App\Models\Assignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class StoreAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [Assignment::class, $this->route('module')]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'instructions' => ['nullable', 'string'],
            'submission_type' => ['required', new Enum(AssignmentSubmissionType::class)],
            'due_at' => ['nullable', 'date'],
            'allow_late' => ['nullable', 'boolean'],
            'late_penalty_policy_id' => ['nullable', 'integer', Rule::exists('late_penalty_policies', 'id')],
            'max_score' => ['nullable', 'numeric', 'min:0'],
            'plagiarism_check_enabled' => ['nullable', 'boolean'],
            'is_required' => ['nullable', 'boolean'],
            'order_index' => ['nullable', 'integer', 'min:0'],
            'rubrics' => ['nullable', 'array'],
            'rubrics.*.criterion' => ['required_with:rubrics', 'string', 'max:200'],
            'rubrics.*.max_points' => ['required_with:rubrics', 'numeric', 'min:0'],
        ];
    }
}
