<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\AssignmentSubmission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class GradeSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var AssignmentSubmission $submission */
        $submission = $this->route('submission');

        return $this->user()->can('grade', $submission->assignment);
    }

    public function rules(): array
    {
        return [
            'raw_score' => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string'],
            'rubric_scores' => ['nullable', 'array'],
            'rubric_scores.*.rubric_id' => ['required_with:rubric_scores', 'integer', Rule::exists('assignment_rubrics', 'id')],
            'rubric_scores.*.score' => ['required_with:rubric_scores', 'numeric', 'min:0'],
            'rubric_scores.*.comment' => ['nullable', 'string'],
        ];
    }
}
