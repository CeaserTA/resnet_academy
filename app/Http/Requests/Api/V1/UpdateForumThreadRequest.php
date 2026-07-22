<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\ForumThread;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateForumThreadRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ForumThread $thread */
        $thread = $this->route('thread');

        return $this->user()->can('moderate', $thread);
    }

    public function rules(): array
    {
        return [
            'is_pinned' => ['sometimes', 'boolean'],
            'is_locked' => ['sometimes', 'boolean'],
        ];
    }
}
