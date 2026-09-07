<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

final class NewPasswordController extends Controller
{
    /**
     * @throws ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request): void {
                DB::transaction(function () use ($user, $request): void {
                    $user->forceFill([
                        'password_hash' => Hash::make($request->string('password')->toString()),
                    ])->save();

                    // Clicking a single-use emailed link is itself proof of inbox ownership —
                    // closes the loop for admin-invited accounts (`UserProvisionedQueued`) without
                    // a separate "verify your email" step. A no-op for an already-verified
                    // self-service reset. Previously a separate, unwrapped UPDATE from the
                    // password-hash save above; a crash between the two left a user with a new
                    // password but email_verified_at unset.
                    if (! $user->hasVerifiedEmail()) {
                        $user->markEmailAsVerified();
                    }
                });

                event(new PasswordReset($user));
            }
        );

        if ($status != Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['status' => __($status)]);
    }
}
