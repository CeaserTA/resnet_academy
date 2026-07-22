<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

final class RegisteredUserController extends Controller
{
    /**
     * Students self-register (either method, per architecture.md §4); instructors/admins
     * are invite-provisioned via AdminUserController, never through this endpoint.
     *
     * @throws ValidationException
     */
    public function store(Request $request): Response
    {
        $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:191', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'role' => UserRole::Student,
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password_hash' => Hash::make($request->string('password')->toString()),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }
}
