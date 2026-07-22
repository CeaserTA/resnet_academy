<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateModuleItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('moduleItem'));
    }

    public function rules(): array
    {
        return [
            'order_index' => ['sometimes', 'integer', 'min:0'],
            'is_required' => ['sometimes', 'boolean'],
        ];
    }
}
