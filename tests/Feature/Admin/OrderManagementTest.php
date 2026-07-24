<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Models\AuditLog;
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

it('recording a partial payment moves the order to partial with the correct remaining balance', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'status' => OrderStatus::Pending]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}", [
        'amount_paid' => 40,
        'payment_method' => 'mobile_money',
    ]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'partial');
    $response->assertJsonPath('data.amount_paid', '40.00');
    $response->assertJsonPath('data.remaining_balance', 60);
    $response->assertJsonPath('data.payment_method', 'mobile_money');

    $log = AuditLog::where('action', 'order.payment_recorded')->first();
    expect($log)->not->toBeNull();
    expect($log->entity_id)->toBe($order->id);
    // json_encode drops the trailing .0 on a whole-number float, so decoding gives ints here.
    expect($log->meta)->toBe(['from' => 0, 'to' => 40, 'status' => 'partial']);
});

it('recording the rest of the balance moves the order to paid and sets paid_at', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'amount_paid' => '40.00', 'status' => OrderStatus::Partial]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}", ['amount_paid' => 100]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'paid');
    $response->assertJsonPath('data.remaining_balance', 0);
    expect(Order::find($order->id)->paid_at)->not->toBeNull();
});

it('clamps an overpayment to the order amount instead of going negative on the balance', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'status' => OrderStatus::Pending]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}", ['amount_paid' => 150]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'paid');
    $response->assertJsonPath('data.amount_paid', '100.00');
    $response->assertJsonPath('data.remaining_balance', 0);
});

it('denies a non-admin from updating an order', function (): void {
    $instructor = User::factory()->instructor()->create();
    $order = Order::factory()->create();

    $this->actingAs($instructor)->patchJson("/api/v1/admin/orders/{$order->id}", ['amount_paid' => 50])->assertForbidden();
});
