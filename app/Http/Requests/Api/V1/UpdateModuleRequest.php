<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('module'));
    }

    public function rules(): array
    {
        $module = $this->route('module');

        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'order_index' => ['sometimes', 'required', 'integer', 'min:0'],
            'scheduled_start_at' => ['nullable', 'date'],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => [Rule::exists('groups_cohorts', 'id')->where('course_id', $module->course_id)],
        ];
    }
}
