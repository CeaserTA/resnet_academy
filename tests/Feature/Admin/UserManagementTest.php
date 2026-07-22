<?php

declare(strict_types=1);

use App\Models\User;

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

it('lets an admin provision an instructor account', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
        'name' => 'New Instructor',
        'email' => 'new.instructor@resnet.test',
        'password' => 'password123',
        'role' => 'instructor',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('users', ['email' => 'new.instructor@resnet.test', 'role' => 'instructor']);
});
