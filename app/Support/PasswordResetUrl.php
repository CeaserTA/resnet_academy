<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Single source of truth for the password-reset link shape, shared by the standard
 * forgot-password flow (`AppServiceProvider::boot()`) and the admin-provisioning invite flow
 * (`UserProvisionedQueued`) — both mint a token via the same `password_reset_tokens` broker that
 * `NewPasswordController::store()` validates against.
 */
final class PasswordResetUrl
{
    public static function for(string $email, string $token): string
    {
        return config('app.frontend_url')."/reset-password?token={$token}&email=".urlencode($email);
    }
}
