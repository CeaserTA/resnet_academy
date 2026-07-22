<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', User::class);
    }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', new Enum(UserRole::class)],
            'status' => ['sometimes', new Enum(UserStatus::class)],
        ];
    }
}
