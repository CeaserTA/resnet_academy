<?php

declare(strict_types=1);

use App\Models\User;

it('authenticates a user via the login endpoint', function (): void {
    $user = User::factory()->create();

    $response = $this->post('/api/v1/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertNoContent();
});

it('rejects an invalid password', function (): void {
    $user = User::factory()->create();

    $this->post('/api/v1/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

it('logs a user out', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/api/v1/logout');

    $this->assertGuest();
    $response->assertNoContent();
});
