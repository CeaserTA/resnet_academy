<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Rules\FileHasExtension;
use App\Rules\WithinCohortSchedule;
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

    /**
     * Moving a live session to another cohort has to re-check its date against that cohort, even
     * when the request does not resend the date. Filling it in from the saved value puts it
     * through the same rule as any other date.
     */
    protected function prepareForValidation(): void
    {
        $saved = $this->route('resource')?->liveSession;

        if ($saved === null || $this->has('scheduled_at') || ! $this->exists('cohort_id')) {
            return;
        }

        $submitted = $this->filled('cohort_id') ? (int) $this->input('cohort_id') : null;

        if ($submitted !== $saved->cohort_id) {
            $this->merge(['scheduled_at' => $saved->scheduled_at->toIso8601String()]);
        }
    }

    public function rules(): array
    {
        $resource = $this->route('resource');
        $saved = $resource?->liveSession;

        // The cohort this session will be run for once saved: the one submitted, or, when the
        // form did not send one, the one it already has.
        $cohortId = $this->exists('cohort_id')
            ? ($this->filled('cohort_id') ? (int) $this->input('cohort_id') : null)
            : $saved?->cohort_id;

        // A saved date only counts as "kept" when the cohort is kept too. Moving a session to
        // another cohort while leaving its date alone still has to fit the new cohort's range.
        $keptDate = $cohortId === $saved?->cohort_id ? $saved?->scheduled_at : null;

        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'is_required' => ['sometimes', 'boolean'],
            'order_index' => ['sometimes', 'integer', 'min:0'],

            'bunny_stream_video_id' => ['sometimes', 'string', 'max:150'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'caption_url' => ['nullable', 'url', 'max:500'],

            // document / downloadable_file — either paste a URL or upload a file ('file' takes
            // precedence when both are present; see ResourceController::update()).
            'file_url' => ['sometimes', 'url', 'max:500'],
            'file' => ['nullable', 'file', new FileHasExtension(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'csv', 'txt']), 'max:20480'],
            'file_type' => ['sometimes', Rule::in(['pdf', 'pptx', 'docx'])],
            'file_size_kb' => ['nullable', 'integer', 'min:0'],

            'content_html' => ['sometimes', 'string'],

            'url' => ['sometimes', 'url', 'max:500'],

            // scorm — same URL-or-upload choice as above.
            'package_url' => ['sometimes', 'url', 'max:500'],
            'package' => ['nullable', 'file', 'mimes:zip', 'max:51200'],
            'standard' => ['sometimes', Rule::in(['scorm_1_2', 'scorm_2004', 'xapi'])],

            'provider' => ['sometimes', Rule::in(['zoom', 'google_meet'])],
            'meeting_url' => ['sometimes', 'url', 'max:500'],
            'cohort_id' => ['nullable', 'integer', Rule::exists('cohort_courses', 'cohort_id')->where('course_id', $resource?->module?->course_id)],
            'scheduled_at' => ['sometimes', 'date', new WithinCohortSchedule($resource?->module?->course, $keptDate, $cohortId, cohortSelectable: true)],
            'duration_minutes' => ['sometimes', 'integer', 'min:1'],
            // Nullable so a bad link can be cleared again, not just replaced.
            'recording_url' => ['nullable', 'url', 'max:500'],
        ];
    }
}
