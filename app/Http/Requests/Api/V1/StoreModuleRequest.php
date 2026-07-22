<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Module;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [Module::class, $this->route('course')]);
    }

    public function rules(): array
    {
        $course = $this->route('course');

        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
            'scheduled_start_at' => ['nullable', 'date'],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => [Rule::exists('groups_cohorts', 'id')->where('course_id', $course->id)],
        ];
    }
}
