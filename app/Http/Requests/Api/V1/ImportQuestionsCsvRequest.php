<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\QuestionBank;
use Illuminate\Foundation\Http\FormRequest;

final class ImportQuestionsCsvRequest extends FormRequest
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
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ];
    }
}
