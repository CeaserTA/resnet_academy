<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Resource `type` is immutable after creation — only title/description/is_required and the
 * existing type's own fields can change.
 */
final class UpdateResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('resource'));
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'is_required' => ['sometimes', 'boolean'],
            'order_index' => ['sometimes', 'integer', 'min:0'],

            'bunny_stream_video_id' => ['sometimes', 'string', 'max:150'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'caption_url' => ['nullable', 'url', 'max:500'],

            'file_url' => ['sometimes', 'url', 'max:500'],
            'file_type' => ['sometimes', Rule::in(['pdf', 'pptx', 'docx'])],
            'file_size_kb' => ['nullable', 'integer', 'min:0'],

            'content_html' => ['sometimes', 'string'],

            'url' => ['sometimes', 'url', 'max:500'],

            'package_url' => ['sometimes', 'url', 'max:500'],
            'standard' => ['sometimes', Rule::in(['scorm_1_2', 'scorm_2004', 'xapi'])],

            'provider' => ['sometimes', Rule::in(['zoom', 'google_meet'])],
            'meeting_url' => ['sometimes', 'url', 'max:500'],
            'scheduled_at' => ['sometimes', 'date'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
