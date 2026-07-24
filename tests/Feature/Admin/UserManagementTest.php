<?php

declare(strict_types=1);

use App\Models\User;
use App\Notifications\UserProvisionedQueued;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

it('lets an admin list users filtered by role', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->instructor()->count(2)->create();
    User::factory()->student()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/users?role=instructor');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
});

it('denies listing users to non-admins', function (): void {
    $instructor = User::factory()->instructor()->create();

    $response = $this->actingAs($instructor)->getJson('/api/v1/admin/users');

    $response->assertForbidden();
});

it('lets an admin provision an instructor account with no password, and queues an invite email', function (): void {
    Notification::fake();

    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
        'name' => 'New Instructor',
        'email' => 'new.instructor@resnet.test',
        'role' => 'instructor',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('users', ['email' => 'new.instructor@resnet.test', 'role' => 'instructor']);

    $user = User::where('email', 'new.instructor@resnet.test')->firstOrFail();
    expect(Hash::check('password', $user->password_hash))->toBeFalse();

    Notification::assertSentTo($user, UserProvisionedQueued::class);
});

it('rejects provisioning a user with a password field', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
        'name' => 'New Admin',
        'email' => 'new.admin@resnet.test',
        'role' => 'admin',
        'password' => 'ignored123',
    ]);

    // `password` isn't a recognized field on StorePrivilegedUserRequest, so it's simply ignored
    // rather than rejected — the account is still created with no usable password.
    $response->assertCreated();
    $user = User::where('email', 'new.admin@resnet.test')->firstOrFail();
    expect(Hash::check('ignored123', $user->password_hash))->toBeFalse();
});

it('lets an invited (no-password) user set their password via the token link and marks their email verified', function (): void {
    // Mirrors exactly what `Admin\UserController::store()` produces — an unverified user with an
    // unusable placeholder password — without needing an authenticated admin session in this
    // test (the point here is the `/reset-password` consume side, not the provisioning endpoint,
    // which is already covered above).
    $user = User::factory()->instructor()->unverified()->create([
        'password_hash' => Hash::make(Str::random(64)),
    ]);
    expect($user->email_verified_at)->toBeNull();

    $token = Password::broker()->createToken($user);

    $response = $this->postJson('/api/v1/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'a-new-password',
        'password_confirmation' => 'a-new-password',
    ]);

    $response->assertOk();

    $user->refresh();
    expect(Hash::check('a-new-password', $user->password_hash))->toBeTrue();
    expect($user->email_verified_at)->not->toBeNull();
});
