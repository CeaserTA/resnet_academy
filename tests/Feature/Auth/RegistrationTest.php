<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\VerifyEmailQueued;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

it('registers a new user as a student', function (): void {
    $response = $this->post('/api/v1/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertNoContent();
    expect(User::where('email', 'test@example.com')->first()->role)->toBe(UserRole::Student);
});

it('ignores a client-submitted role and always registers as a student', function (): void {
    $this->post('/api/v1/register', [
        'name' => 'Test User',
        'email' => 'test2@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'admin',
    ]);

    expect(User::where('email', 'test2@example.com')->first()->role)->toBe(UserRole::Student);
});

it('sends a queued verification email so a mail failure cannot 500 the registration request', function (): void {
    Notification::fake();

    $response = $this->post('/api/v1/register', [
        'name' => 'Test User',
        'email' => 'test3@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertNoContent();
    $user = User::where('email', 'test3@example.com')->first();
    Notification::assertSentTo($user, VerifyEmailQueued::class);
    expect(new VerifyEmailQueued)->toBeInstanceOf(ShouldQueue::class);
});
