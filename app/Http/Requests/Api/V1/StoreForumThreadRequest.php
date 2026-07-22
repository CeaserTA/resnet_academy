<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Course;
use App\Models\ForumThread;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreForumThreadRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Course $course */
        $course = $this->route('course');

        return $this->user()->can('create', [ForumThread::class, $course]);
    }

    /**
     * `attachment` is only ever a real file for image/video/audio — `article` is a long-form
     * text mode with no file. 5MB cap applied uniformly (the user's stated video limit,
     * extended to image/audio for simplicity — never trust the client-side check alone).
     */
    public function rules(): array
    {
        $attachmentType = $this->input('attachment_type');

        return [
            'body' => ['required', 'string'],
            'attachment_type' => ['nullable', Rule::in(['image', 'video', 'audio', 'article'])],
            'attachment' => [
                Rule::requiredIf(in_array($attachmentType, ['image', 'video', 'audio'], true)),
                'nullable',
                'file',
                'max:5120',
                Rule::when($attachmentType === 'image', ['mimes:jpg,jpeg,png,webp,gif']),
                Rule::when($attachmentType === 'video', ['mimes:mp4,webm,mov,ogg']),
                Rule::when($attachmentType === 'audio', ['mimes:mp3,wav,m4a,ogg']),
            ],
        ];
    }
}
