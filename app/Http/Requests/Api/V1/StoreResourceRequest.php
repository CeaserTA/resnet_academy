<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\ResourceType;
use App\Models\Resource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * One request handles all 7 resource types (FR-10) — the `type` field selects which
 * type-specific fields are required, matching the type-specific detail tables in schema.sql
 * §6 rather than one wide nullable shape.
 */
final class StoreResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [Resource::class, $this->route('module')]);
    }

    public function rules(): array
    {
        return [
            'type' => ['required', new Enum(ResourceType::class)],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'is_required' => ['nullable', 'boolean'],
            'order_index' => ['nullable', 'integer', 'min:0'],

            // video
            'bunny_stream_video_id' => ['required_if:type,video', 'string', 'max:150'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'caption_url' => ['nullable', 'url', 'max:500'],

            // document / downloadable_file — either paste a URL or upload a file ('file' takes
            // precedence when both are present; see ResourceController::store()).
            'file_url' => [Rule::requiredIf(fn () => in_array($this->input('type'), ['document', 'downloadable_file'], true) && ! $this->hasFile('file')), 'url', 'max:500'],
            'file' => ['nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,zip,csv,txt', 'max:20480'],
            'file_type' => ['required_if:type,document', Rule::in(['pdf', 'pptx', 'docx'])],
            'file_size_kb' => ['nullable', 'integer', 'min:0'],

            // reading
            'content_html' => ['required_if:type,reading', 'string'],

            // external_link
            'url' => ['required_if:type,external_link', 'url', 'max:500'],

            // scorm — same URL-or-upload choice as above.
            'package_url' => [Rule::requiredIf(fn () => $this->input('type') === 'scorm' && ! $this->hasFile('package')), 'url', 'max:500'],
            'package' => ['nullable', 'file', 'mimes:zip', 'max:51200'],
            'standard' => ['required_if:type,scorm', Rule::in(['scorm_1_2', 'scorm_2004', 'xapi'])],

            // live_session
            'provider' => ['required_if:type,live_session', Rule::in(['zoom', 'google_meet'])],
            'meeting_url' => ['required_if:type,live_session', 'url', 'max:500'],
            'scheduled_at' => ['required_if:type,live_session', 'date'],
            'duration_minutes' => ['required_if:type,live_session', 'integer', 'min:1'],
        ];
    }
}
