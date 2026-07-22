<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\EvaluationAttempt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class GradeEvaluationAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var EvaluationAttempt $attempt */
        $attempt = $this->route('attempt');

        return $this->user()->can('grade', $attempt->evaluation);
    }

    public function rules(): array
    {
        return [
            'answer_grades' => ['required', 'array', 'min:1'],
            'answer_grades.*.answer_id' => ['required', 'integer', Rule::exists('evaluation_attempt_answers', 'id')],
            'answer_grades.*.is_correct' => ['nullable', 'boolean'],
            'answer_grades.*.points_awarded' => ['required', 'numeric', 'min:0'],
        ];
    }
}
