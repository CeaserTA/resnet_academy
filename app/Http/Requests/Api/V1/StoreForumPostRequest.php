<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\ForumPost;
use App\Models\ForumThread;
use Illuminate\Foundation\Http\FormRequest;

final class StoreForumPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ForumThread $thread */
        $thread = $this->route('thread');

        return $this->user()->can('create', [ForumPost::class, $thread]);
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string'],
        ];
    }
}
