<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\EvaluationAttempt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SubmitEvaluationAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var EvaluationAttempt $attempt */
        $attempt = $this->route('attempt');

        return $this->user()->id === $attempt->student_id;
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer', Rule::exists('questions', 'id')],
            'answers.*.selected_option_ids' => ['nullable', 'array'],
            'answers.*.selected_option_ids.*' => ['integer', Rule::exists('question_options', 'id')],
            'answers.*.answer_text' => ['nullable', 'string'],
        ];
    }
}
