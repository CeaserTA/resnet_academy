<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['nullable', 'string', 'max:75'],
            'last_name' => ['nullable', 'string', 'max:75'],
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'country' => ['nullable', 'filled', 'string', 'max:100'],
            'city' => ['nullable', 'filled', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ],
            'occupation' => ['nullable', 'string', 'max:150'],
            'linkedin_profile' => ['nullable', 'url', 'max:500'],
            'portfolio_website' => ['nullable', 'url', 'max:500'],
        ];
    }
}
