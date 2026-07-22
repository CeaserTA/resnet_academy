<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Course;
use App\Models\Notification;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

it('lets an admin start a conversation with an instructor', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/conversations', [
        'recipient_id' => $instructor->id,
        'subject' => 'Course review',
        'body' => 'Can we discuss the syllabus?',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.subject', 'Course review');
    expect(Notification::where('user_id', $instructor->id)->where('type', 'new_message')->exists())->toBeTrue();
});

it('lets an instructor message a student enrolled in their course', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($instructor)->postJson('/api/v1/conversations', [
        'recipient_id' => $student->id,
        'body' => 'Great work on your last submission.',
    ]);

    $response->assertCreated();
});

it('denies an instructor from messaging a student not enrolled in any course they teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $response = $this->actingAs($instructor)->postJson('/api/v1/conversations', [
        'recipient_id' => $student->id,
        'body' => 'Hello',
    ]);

    $response->assertForbidden();
});

it('denies a student from messaging another student', function (): void {
    $studentA = User::factory()->student()->create();
    $studentB = User::factory()->student()->create();

    $response = $this->actingAs($studentA)->postJson('/api/v1/conversations', [
        'recipient_id' => $studentB->id,
        'body' => 'Hey',
    ]);

    $response->assertForbidden();
});

it('reuses the existing conversation between the same two people instead of creating a new one', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();

    $first = $this->actingAs($admin)->postJson('/api/v1/conversations', [
        'recipient_id' => $instructor->id,
        'body' => 'First message',
    ]);
    $second = $this->actingAs($admin)->postJson('/api/v1/conversations', [
        'recipient_id' => $instructor->id,
        'body' => 'Second message',
    ]);

    expect($first->json('data.id'))->toBe($second->json('data.id'));
    $this->assertDatabaseCount('conversations', 1);
    $this->assertDatabaseCount('messages', 2);
});

it('marks messages read when the recipient opens the conversation', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();

    $start = $this->actingAs($admin)->postJson('/api/v1/conversations', [
        'recipient_id' => $instructor->id,
        'body' => 'Please review this.',
    ]);
    $conversationId = $start->json('data.id');

    $this->assertDatabaseHas('messages', ['conversation_id' => $conversationId, 'read_at' => null]);

    $this->actingAs($instructor)->getJson("/api/v1/conversations/{$conversationId}")->assertOk();

    $this->assertDatabaseMissing('messages', ['conversation_id' => $conversationId, 'read_at' => null]);
});

it('denies a user outside the conversation from viewing it', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $outsider = User::factory()->instructor()->create();

    $start = $this->actingAs($admin)->postJson('/api/v1/conversations', [
        'recipient_id' => $instructor->id,
        'body' => 'Private note',
    ]);

    $response = $this->actingAs($outsider)->getJson("/api/v1/conversations/{$start->json('data.id')}");

    $response->assertForbidden();
});
