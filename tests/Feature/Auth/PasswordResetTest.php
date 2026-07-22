<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

it('sends a password reset link on request', function (): void {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/api/v1/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

it('resets the password with a valid token', function (): void {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/api/v1/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user): bool {
        $response = $this->post('/api/v1/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertSessionHasNoErrors()->assertStatus(200);

        return true;
    });
});
