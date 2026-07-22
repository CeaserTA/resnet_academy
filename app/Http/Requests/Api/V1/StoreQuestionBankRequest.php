<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\QuestionBank;
use Illuminate\Foundation\Http\FormRequest;

final class StoreQuestionBankRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [QuestionBank::class, $this->route('course')]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
        ];
    }
}
