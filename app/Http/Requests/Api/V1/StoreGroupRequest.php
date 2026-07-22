<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\GroupsCohort;
use Illuminate\Foundation\Http\FormRequest;

final class StoreGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [GroupsCohort::class, $this->route('course')]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
        ];
    }
}
