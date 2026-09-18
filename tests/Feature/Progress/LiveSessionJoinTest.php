<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\LiveSessionAttendance;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

/**
 * Phase 1 of verified attendance: a student is only ever recorded as attended by actually
 * following the join link (GET /resources/{resource}/join), which is also the only place that
 * ever reveals the real meeting URL — there is no more self-report "mark as attended" action.
 */
function enrolAndUnlock(User $student, Course $course): void
{
    app(EnrolmentService::class)->enrol(
        $student,
        $course,
        EnrolmentSource::Self,
        CohortCourse::factory()->for($course)->open()->create()->id,
    );
}

function createLiveSessionResource(Course $course, array $sessionOverrides = []): Resource
{
    $module = Module::factory()->for($course)->create();
    $resource = Resource::factory()->for($module)->liveSession()->create();

    if ($sessionOverrides !== []) {
        $resource->liveSession()->update($sessionOverrides);
    }

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'resource',
        'item_id' => $resource->id,
        'order_index' => 1,
        'is_required' => false,
    ]);

    return $resource->fresh();
}

it('denies a student who is not enrolled in the course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $resource = createLiveSessionResource($course, [
        'scheduled_at' => now()->subMinutes(10),
        'duration_minutes' => 60,
    ]);

    $response = $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join");

    $response->assertForbidden();
    expect(LiveSessionAttendance::where('resource_id', $resource->id)->exists())->toBeFalse();
});

it('denies a student joining before the session has started', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $resource = createLiveSessionResource($course, [
        'scheduled_at' => now()->addMinutes(30),
        'duration_minutes' => 60,
    ]);

    enrolAndUnlock($student, $course);

    $response = $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join");

    $response->assertForbidden();
    expect(LiveSessionAttendance::where('resource_id', $resource->id)->exists())->toBeFalse();
});

it('denies a student joining more than the 30-minute grace period after the session ended', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    // Started 3 hours ago, ran for 60 minutes, so it ended 2 hours ago — well past the 30-minute grace window.
    $resource = createLiveSessionResource($course, [
        'scheduled_at' => now()->subHours(3),
        'duration_minutes' => 60,
    ]);

    enrolAndUnlock($student, $course);

    $response = $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join");

    $response->assertForbidden();
    expect(LiveSessionAttendance::where('resource_id', $resource->id)->exists())->toBeFalse();
});

it('redirects a successful join to the session real meeting URL and records attendance', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $resource = createLiveSessionResource($course, [
        'scheduled_at' => now()->subMinutes(10),
        'duration_minutes' => 60,
    ]);

    enrolAndUnlock($student, $course);

    $response = $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join");

    $response->assertRedirect($resource->liveSession->meeting_url);

    $attendance = LiveSessionAttendance::where('resource_id', $resource->id)->where('student_id', $student->id)->first();
    expect($attendance)->not->toBeNull();
    expect($attendance->attended)->toBeTrue();
    expect($attendance->joined_at)->not->toBeNull();
    expect($attendance->source)->toBe('click');
});

it('only records one attendance row on repeat joins, keeping the original joined_at', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $resource = createLiveSessionResource($course, [
        'scheduled_at' => now()->subMinutes(10),
        'duration_minutes' => 60,
    ]);

    enrolAndUnlock($student, $course);

    $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join")->assertRedirect();
    $firstJoinedAt = LiveSessionAttendance::where('resource_id', $resource->id)->where('student_id', $student->id)->first()->joined_at;

    $this->travel(5)->minutes();

    $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join")->assertRedirect($resource->liveSession->meeting_url);

    $rows = LiveSessionAttendance::where('resource_id', $resource->id)->where('student_id', $student->id)->get();
    expect($rows)->toHaveCount(1);
    expect($rows->first()->joined_at->equalTo($firstJoinedAt))->toBeTrue();
});

it('no longer exposes the old self-report attendance endpoint', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $resource = createLiveSessionResource($course);

    enrolAndUnlock($student, $course);

    $response = $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/attendance");

    $response->assertNotFound();
});
