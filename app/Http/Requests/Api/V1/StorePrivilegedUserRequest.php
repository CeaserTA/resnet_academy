<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

final class StorePrivilegedUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('createPrivileged', User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:191', 'unique:'.User::class],
            'password' => ['required', Rules\Password::defaults()],
            'role' => ['required', Rule::in([UserRole::Instructor->value, UserRole::Admin->value])],
        ];
    }
}
