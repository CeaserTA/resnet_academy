<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\AssignmentSubmissionType;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use Illuminate\Foundation\Http\FormRequest;

final class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [AssignmentSubmission::class, $this->route('assignment')]);
    }

    public function rules(): array
    {
        /** @var Assignment $assignment */
        $assignment = $this->route('assignment');

        $fileRule = $assignment->submission_type === AssignmentSubmissionType::File ? 'required' : 'nullable';
        $textRule = $assignment->submission_type === AssignmentSubmissionType::Text ? 'required' : 'nullable';

        if ($assignment->submission_type === AssignmentSubmissionType::Both) {
            $fileRule = 'required_without:text_content';
            $textRule = 'required_without:file';
        }

        return [
            'file' => [$fileRule, 'file', 'max:20480'],
            'text_content' => [$textRule, 'string'],
        ];
    }
}
