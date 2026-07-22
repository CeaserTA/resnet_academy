<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\ForumPost;
use App\Models\ForumPostReport;
use Illuminate\Foundation\Http\FormRequest;

final class StoreForumPostReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ForumPost $post */
        $post = $this->route('post');

        return $this->user()->can('create', [ForumPostReport::class, $post]);
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:300'],
        ];
    }
}
