<?php

namespace App\Providers;

use App\Support\PasswordResetUrl;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Was previously building a `/password-reset/{token}?email=...` link, but the frontend
        // route is `/reset-password` with both `token` and `email` as query params
        // (`ResetPasswordPage.tsx`) — the emailed link 404'd on the frontend until this fix.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return PasswordResetUrl::for($notifiable->getEmailForPasswordReset(), $token);
        });
    }
}
