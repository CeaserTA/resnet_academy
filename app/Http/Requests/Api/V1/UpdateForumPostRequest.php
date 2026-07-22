<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\ForumPost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateForumPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ForumPost $post */
        $post = $this->route('post');

        return $this->user()->can('update', $post);
    }

    public function rules(): array
    {
        $attachmentType = $this->input('attachment_type');

        return [
            'body' => ['required', 'string'],
            'attachment_type' => ['nullable', Rule::in(['image', 'video', 'audio', 'article'])],
            'attachment' => [
                'nullable',
                'file',
                'max:5120',
                Rule::when($attachmentType === 'image', ['mimes:jpg,jpeg,png,webp,gif']),
                Rule::when($attachmentType === 'video', ['mimes:mp4,webm,mov,ogg']),
                Rule::when($attachmentType === 'audio', ['mimes:mp3,wav,m4a,ogg']),
            ],
            'remove_attachment' => ['sometimes', 'boolean'],
        ];
    }
}
