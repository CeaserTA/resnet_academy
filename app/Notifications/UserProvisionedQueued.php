<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use App\Support\PasswordResetUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent when an admin provisions an instructor/admin account (`Admin\UserController::store()`).
 * The account has no usable password at creation — this mints the same kind of token
 * `NewPasswordController::store()` already validates, so "set your password" and "reset your
 * password" share one consume-side code path even though they're triggered differently.
 * Queued (see `VerifyEmailQueued`) so a mail hiccup can't 500 the provisioning request.
 */
final class UserProvisionedQueued extends Notification implements ShouldQueue
{
    use Queueable;

    /** Public, same as Laravel's own `ResetPassword` notification — tests read it directly. */
    public function __construct(public readonly string $token) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $roleLabel = ucfirst($notifiable->role->value);
        $url = PasswordResetUrl::for($notifiable->email, $this->token);

        return (new MailMessage)
            ->subject("You've been added to Resnet LMS as an {$roleLabel}")
            ->greeting("Welcome, {$notifiable->name}!")
            ->line("An administrator has added you to Resnet LMS as an {$roleLabel}.")
            ->action('Set your password', $url)
            ->line('This link expires in 60 minutes. If you didn\'t expect this, you can ignore this email.');
    }
}
