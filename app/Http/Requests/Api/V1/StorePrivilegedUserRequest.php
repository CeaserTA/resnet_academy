<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * No `password` field — the account is created with no usable password and the new user sets
 * their own via an emailed invite link (`UserProvisionedQueued`), never a credential the admin
 * types in and transmits.
 */
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
            'role' => ['required', Rule::in([UserRole::Instructor->value, UserRole::Admin->value])],
        ];
    }
}
