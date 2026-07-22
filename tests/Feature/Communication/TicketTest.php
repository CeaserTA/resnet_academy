<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;

it('lets a student raise a support ticket', function (): void {
    $student = User::factory()->student()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/tickets', [
        'subject' => 'Cannot access my course',
        'body' => 'The video player is stuck on loading.',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.status', 'open');
    $response->assertJsonPath('data.messages.0.body', 'The video player is stuck on loading.');
});

it('denies an instructor from raising a ticket', function (): void {
    $instructor = User::factory()->instructor()->create();

    $response = $this->actingAs($instructor)->postJson('/api/v1/tickets', [
        'subject' => 'Test',
        'body' => 'Test',
    ]);

    $response->assertForbidden();
});

it('notifies the assigned staff member when the student replies, and the student when staff replies', function (): void {
    $student = User::factory()->student()->create();
    $admin = User::factory()->admin()->create();

    $ticket = Ticket::factory()->for($student, 'student')->create(['assigned_to' => $admin->id]);

    $this->actingAs($student)->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'Any update?'])->assertCreated();
    expect(Notification::where('user_id', $admin->id)->where('type', 'ticket_reply')->exists())->toBeTrue();

    $this->actingAs($admin)->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'Looking into it now.'])->assertCreated();
    expect(Notification::where('user_id', $student->id)->where('type', 'ticket_reply')->exists())->toBeTrue();
});

it('lets an admin resolve a ticket and denies a student from doing so', function (): void {
    $student = User::factory()->student()->create();
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->for($student, 'student')->create();

    $denied = $this->actingAs($student)->patchJson("/api/v1/tickets/{$ticket->id}", ['status' => 'resolved']);
    $denied->assertForbidden();

    $allowed = $this->actingAs($admin)->patchJson("/api/v1/tickets/{$ticket->id}", ['status' => 'resolved']);
    $allowed->assertOk();
    $allowed->assertJsonPath('data.status', 'resolved');
    expect($allowed->json('data.resolved_at'))->not->toBeNull();
});

it('lets an instructor manage tickets scoped to a course they teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    $ticket = Ticket::factory()->for($student, 'student')->create(['course_id' => $course->id]);

    $response = $this->actingAs($instructor)->patchJson("/api/v1/tickets/{$ticket->id}", ['assigned_to' => $instructor->id]);

    $response->assertOk();
    $response->assertJsonPath('data.assigned_to.id', $instructor->id);
});

it('lists only the students own tickets to that student', function (): void {
    $student = User::factory()->student()->create();
    $otherStudent = User::factory()->student()->create();

    Ticket::factory()->for($student, 'student')->create();
    Ticket::factory()->for($otherStudent, 'student')->create();

    $response = $this->actingAs($student)->getJson('/api/v1/tickets');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});
