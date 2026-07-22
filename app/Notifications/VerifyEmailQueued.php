<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Laravel's default `VerifyEmail` notification sends synchronously, so a transient mail
 * failure (rate limit, an unverified Resend sandbox recipient, a network blip) would throw
 * mid-request and 500 the registration response even though the user row already committed —
 * exactly the failure mode `SendEnrolmentConfirmationEmail` already avoids by being queued.
 * This is the same fix applied to the verification email.
 */
final class VerifyEmailQueued extends VerifyEmail implements ShouldQueue
{
    use Queueable;
}
