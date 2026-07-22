<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;

it('lists every order across every student for an admin', function (): void {
    $admin = User::factory()->admin()->create();
    $studentA = User::factory()->student()->create();
    $studentB = User::factory()->student()->create();

    Order::factory()->for($studentA, 'student')->create();
    Order::factory()->for($studentB, 'student')->paid()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/orders');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
    expect($response->json('data.0.student'))->not->toBeNull();
    expect($response->json('data.0.course'))->not->toBeNull();
});

it('filters orders by status', function (): void {
    $admin = User::factory()->admin()->create();
    Order::factory()->create(['status' => OrderStatus::Pending]);
    Order::factory()->paid()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/orders?status=paid');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.status'))->toBe('paid');
});

it('denies a non-admin from listing orders', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $this->actingAs($instructor)->getJson('/api/v1/admin/orders')->assertForbidden();
    $this->actingAs($student)->getJson('/api/v1/admin/orders')->assertForbidden();
});
