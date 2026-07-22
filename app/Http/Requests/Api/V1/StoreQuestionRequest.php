<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\QuestionType;
use App\Models\QuestionBank;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class StoreQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var QuestionBank $bank */
        $bank = $this->route('bank');

        return $this->user()->can('update', $bank);
    }

    public function rules(): array
    {
        return [
            'type' => ['required', new Enum(QuestionType::class)],
            'question_text' => ['required', 'string'],
            'points' => ['nullable', 'numeric', 'min:0'],
            'options' => ['required_if:type,mcq_single,mcq_multi,true_false', 'array', 'min:2'],
            'options.*.option_text' => ['required_with:options', 'string', 'max:500'],
            'options.*.is_correct' => ['nullable', 'boolean'],
        ];
    }
}
