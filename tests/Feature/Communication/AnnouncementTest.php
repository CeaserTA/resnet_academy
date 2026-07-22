<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Course;
use App\Models\Notification;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

it('lets an instructor post an announcement and notifies every confirmed-enrolled student', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($instructor)->postJson("/api/v1/courses/{$course->id}/announcements", [
        'title' => 'Class moved to next week',
        'body' => 'Please check the new schedule.',
    ]);

    $response->assertCreated();
    expect(
        Notification::where('user_id', $student->id)->where('type', 'announcement_posted')->exists(),
    )->toBeTrue();
});

it('denies a student from posting an announcement', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/announcements", [
        'title' => 'Trying to post',
        'body' => 'Should not work.',
    ]);

    $response->assertForbidden();
});
