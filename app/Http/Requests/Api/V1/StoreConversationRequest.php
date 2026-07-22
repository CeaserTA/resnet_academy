<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Conversation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Conversation::class);
    }

    public function rules(): array
    {
        return [
            'recipient_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'subject' => ['nullable', 'string', 'max:200'],
            'body' => ['required', 'string'],
        ];
    }
}
