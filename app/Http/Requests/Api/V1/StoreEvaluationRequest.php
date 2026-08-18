<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Evaluation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [Evaluation::class, $this->route('module')]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'instructions' => ['nullable', 'string'],
            'pass_score' => ['required', 'numeric', 'min:0', 'max:100'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'randomize_questions' => ['nullable', 'boolean'],
            'questions_per_attempt' => ['nullable', 'integer', 'min:1'],
            'available_from' => ['nullable', 'date'],
            'available_until' => ['nullable', 'date', 'after:available_from'],
            'is_required' => ['nullable', 'boolean'],
            'order_index' => ['nullable', 'integer', 'min:0'],
            'question_ids' => ['nullable', 'array'],
            'question_ids.*' => ['integer', Rule::exists('questions', 'id')],
        ];
    }
}
