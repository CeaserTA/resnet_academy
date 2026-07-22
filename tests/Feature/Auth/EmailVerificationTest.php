<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;

it('verifies email with a valid signed link', function (): void {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $response = $this->actingAs($user)->get($verificationUrl);

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $response->assertRedirect(config('app.frontend_url').'/dashboard?verified=1');
});

it('always redirects to the frontend dashboard, ignoring a stale intended url in the session', function (): void {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    // Simulates a leftover `url.intended` from an earlier, unrelated unauthenticated request
    // in the same browser session — redirect()->intended() would have honored this instead of
    // going to the dashboard, which is exactly the bug this test guards against.
    $response = $this
        ->withSession(['url.intended' => 'http://127.0.0.1:8000/api/v1/login'])
        ->actingAs($user)
        ->get($verificationUrl);

    $response->assertRedirect(config('app.frontend_url').'/dashboard?verified=1');
});

it('does not verify email with an invalid hash', function (): void {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1('wrong-email')]
    );

    $this->actingAs($user)->get($verificationUrl);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});
