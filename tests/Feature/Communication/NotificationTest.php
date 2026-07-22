<?php

declare(strict_types=1);

use App\Models\Notification;
use App\Models\User;

it('lists only the users own notifications with an unread count', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Notification::factory()->for($user)->count(2)->create(['is_read' => false]);
    Notification::factory()->for($user)->create(['is_read' => true]);
    Notification::factory()->for($other)->create(['is_read' => false]);

    $response = $this->actingAs($user)->getJson('/api/v1/notifications');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(3);
    expect($response->json('meta.unread_count'))->toBe(2);
});

it('marks a single notification read and denies marking someone elses', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $notification = Notification::factory()->for($other)->create(['is_read' => false]);

    $denied = $this->actingAs($user)->postJson("/api/v1/notifications/{$notification->id}/read");
    $denied->assertForbidden();

    $ownNotification = Notification::factory()->for($user)->create(['is_read' => false]);
    $allowed = $this->actingAs($user)->postJson("/api/v1/notifications/{$ownNotification->id}/read");
    $allowed->assertNoContent();

    $this->assertDatabaseHas('notifications', ['id' => $ownNotification->id, 'is_read' => true]);
});

it('marks every unread notification read in one call', function (): void {
    $user = User::factory()->create();
    Notification::factory()->for($user)->count(3)->create(['is_read' => false]);

    $this->actingAs($user)->postJson('/api/v1/notifications/read-all')->assertNoContent();

    expect(Notification::where('user_id', $user->id)->where('is_read', false)->count())->toBe(0);
});
