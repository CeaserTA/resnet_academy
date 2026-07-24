<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function fakeReceipt(): UploadedFile
{
    return UploadedFile::fake()->create('receipt.jpg', 100, 'image/jpeg');
}

it('lets a student submit a payment against their own order', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();
    $order = Order::factory()->for($student, 'student')->create(['amount' => '100.00']);

    $response = $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 40,
        'receipt' => fakeReceipt(),
    ]);

    $response->assertCreated();
    expect($response->json('data.status'))->toBe('pending');
    expect($response->json('data.receipt_url'))->not->toBeNull();

    $submission = PaymentSubmission::first();
    Storage::disk('r2')->assertExists($submission->receipt_path);
    expect($order->fresh()->amount_paid)->toEqual('0.00');
});

it('rejects a submission that exceeds the remaining balance', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();
    $order = Order::factory()->for($student, 'student')->create(['amount' => '100.00', 'amount_paid' => '60.00']);

    $response = $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 50,
        'receipt' => fakeReceipt(),
    ]);

    $response->assertUnprocessable();
});

it('rejects a second submission while one is already pending', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();
    $order = Order::factory()->for($student, 'student')->create(['amount' => '100.00']);

    $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 40,
        'receipt' => fakeReceipt(),
    ])->assertCreated();

    $response = $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 10,
        'receipt' => fakeReceipt(),
    ]);

    $response->assertUnprocessable();
});

it('rejects a submission against an already fully paid order', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();
    $order = Order::factory()->for($student, 'student')->state(['amount' => '100.00'])->paid()->create();

    $response = $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 10,
        'receipt' => fakeReceipt(),
    ]);

    $response->assertUnprocessable();
});

it('denies a student submitting a payment against someone else\'s order', function (): void {
    Storage::fake('r2');
    $order = Order::factory()->create(['amount' => '100.00']);
    $otherStudent = User::factory()->student()->create();

    $response = $this->actingAs($otherStudent)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 10,
        'receipt' => fakeReceipt(),
    ]);

    $response->assertForbidden();
});

it('confirming a partial submission updates the order and audits it', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'status' => OrderStatus::Pending]);
    $submission = PaymentSubmission::factory()->for($order)->create(['amount' => '40.00']);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/confirm");

    $response->assertOk();
    $response->assertJsonPath('data.status', 'confirmed');

    $order->refresh();
    expect($order->amount_paid)->toEqual('40.00');
    expect($order->status)->toBe(OrderStatus::Partial);

    $log = AuditLog::where('action', 'order.payment_confirmed')->first();
    expect($log)->not->toBeNull();
    expect($log->entity_id)->toBe($order->id);
});

it('confirming a submission that completes the balance moves the order to paid and sets paid_at', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'amount_paid' => '60.00', 'status' => OrderStatus::Partial]);
    $submission = PaymentSubmission::factory()->for($order)->create(['amount' => '40.00']);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/confirm");

    $response->assertOk();
    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Paid);
    expect($order->paid_at)->not->toBeNull();
});

it('rejecting a submission leaves the order untouched and allows a resubmission', function (): void {
    Storage::fake('r2');
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $order = Order::factory()->for($student, 'student')->create(['amount' => '100.00', 'status' => OrderStatus::Pending]);
    $submission = PaymentSubmission::factory()->for($order)->create(['amount' => '40.00']);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/reject");

    $response->assertOk();
    $response->assertJsonPath('data.status', 'rejected');
    expect($order->fresh()->amount_paid)->toEqual('0.00');

    $log = AuditLog::where('action', 'order.payment_rejected')->first();
    expect($log)->not->toBeNull();

    $this->actingAs($student)->postJson("/api/v1/orders/{$order->id}/payment-submissions", [
        'amount' => 40,
        'receipt' => fakeReceipt(),
    ])->assertCreated();
});

it('denies a non-admin from confirming or rejecting a submission', function (): void {
    $instructor = User::factory()->instructor()->create();
    $submission = PaymentSubmission::factory()->create();

    $this->actingAs($instructor)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/confirm")->assertForbidden();
    $this->actingAs($instructor)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/reject")->assertForbidden();
});

it('cannot confirm or reject a submission that was already reviewed', function (): void {
    $admin = User::factory()->admin()->create();
    $submission = PaymentSubmission::factory()->confirmed()->create();

    $this->actingAs($admin)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/confirm")->assertUnprocessable();
    $this->actingAs($admin)->patchJson("/api/v1/admin/payment-submissions/{$submission->id}/reject")->assertUnprocessable();
});

it('receivables includes a partial order with a pending submission, and partials excludes it until resolved', function (): void {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->create(['amount' => '100.00', 'amount_paid' => '40.00', 'status' => OrderStatus::Partial]);
    PaymentSubmission::factory()->for($order)->create(['status' => PaymentSubmissionStatus::Pending]);

    $pending = $this->actingAs($admin)->getJson('/api/v1/admin/orders?status=pending');
    $partial = $this->actingAs($admin)->getJson('/api/v1/admin/orders?status=partial');

    expect(collect($pending->json('data'))->pluck('id'))->toContain($order->id);
    expect(collect($partial->json('data'))->pluck('id'))->not->toContain($order->id);
});
