<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\LiveSessionAttendance;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\ResourceProgress;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;

/**
 * A live session is a required module item whose join window closes 30 minutes after it ends, so
 * a student who enrols afterwards could never complete it — permanently blocking the module, the
 * course and the certificate. Attaching a recording is the way through: opening it completes the
 * item exactly as opening an external link does.
 */
beforeEach(function (): void {
    // Saving a recording link triggers RecordingLinkChecker's outbound request. These tests are
    // about completion, not the checker (that has its own tests), so keep them off the network.
    Illuminate\Support\Facades\Http::fake(['*' => Illuminate\Support\Facades\Http::response('<html>recording</html>', 200)]);
});

function recordingTestCourse(): array
{
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($admin->id, ['is_primary' => true, 'assigned_at' => now()]);

    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    $resource = Resource::factory()->for($module)->liveSession()->create();

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'resource',
        'item_id' => $resource->id,
        'order_index' => 1,
        'is_required' => true,
    ]);

    app(EnrolmentService::class)->enrol(
        $student,
        $course,
        EnrolmentSource::Self,
        CohortCourse::factory()->for($course)->open()->create()->id,
    );

    return ['admin' => $admin, 'student' => $student, 'course' => $course, 'module' => $module, 'resource' => $resource];
}

/** Puts the session far enough in the past that the join window (+30 min grace) has closed. */
function sessionHasPassed(Resource $resource, ?string $recordingUrl = null): void
{
    $resource->liveSession()->update([
        'scheduled_at' => now()->subHours(4),
        'duration_minutes' => 60,
        'recording_url' => $recordingUrl,
    ]);
}

it('tells a student the recording is pending when the session has passed with none attached', function (): void {
    ['student' => $student, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource);

    $response = $this->actingAs($student)->getJson("/api/v1/resources/{$resource->id}");

    $response->assertOk();
    $response->assertJsonPath('data.details.access_state', 'recording_pending');
    $response->assertJsonPath('data.details.recording_url', null);
});

it('reports the recording state once a recording is attached', function (): void {
    ['student' => $student, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource, 'https://drive.google.com/file/d/abc123/view');

    $response = $this->actingAs($student)->getJson("/api/v1/resources/{$resource->id}");

    $response->assertJsonPath('data.details.access_state', 'recording');
    $response->assertJsonPath('data.details.recording_url', 'https://drive.google.com/file/d/abc123/view');
});

it('refuses to complete a passed live session that has no recording to open', function (): void {
    ['student' => $student, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource);

    $response = $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-opened");

    // Without this guard a student could complete a required live session by posting
    // mark-opened with nothing to open at all.
    $response->assertStatus(422);
    expect(app(ProgressEngine::class)->isResourceComplete($student->fresh(), $resource->fresh()))->toBeFalse();
});

it('completes the session when the student opens the recording', function (): void {
    ['student' => $student, 'module' => $module, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource, 'https://drive.google.com/file/d/abc123/view');

    $response = $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-opened");

    $response->assertSuccessful();
    expect(app(ProgressEngine::class)->isResourceComplete($student->fresh(), $resource->fresh()))->toBeTrue();
    expect(ResourceProgress::where('student_id', $student->id)->where('resource_id', $resource->id)->whereNotNull('opened_at')->exists())->toBeTrue();

    // The whole point: the required item no longer blocks the module.
    expect(app(ProgressEngine::class)->isModuleItemComplete(
        $student->fresh(),
        ModuleItem::where('module_id', $module->id)->sole(),
    ))->toBeTrue();
});

it('becomes completable as soon as a recording is attached, with no action from the student', function (): void {
    ['admin' => $admin, 'student' => $student, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource);

    $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-opened")->assertStatus(422);

    $this->actingAs($admin)->patchJson("/api/v1/resources/{$resource->id}", [
        'recording_url' => 'https://zoom.us/rec/share/abc123',
    ])->assertOk();

    $this->actingAs($student)->getJson("/api/v1/resources/{$resource->id}")
        ->assertJsonPath('data.details.access_state', 'recording');
    $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-opened")->assertSuccessful();

    expect(app(ProgressEngine::class)->isResourceComplete($student->fresh(), $resource->fresh()))->toBeTrue();
});

it('still completes a session the original way, by joining during the live window', function (): void {
    ['student' => $student, 'resource' => $resource] = recordingTestCourse();
    $resource->liveSession()->update([
        'scheduled_at' => now()->subMinutes(10),
        'duration_minutes' => 60,
        'recording_url' => null,
    ]);

    $this->actingAs($student)->get("/api/v1/resources/{$resource->id}/join")->assertRedirect();

    expect(LiveSessionAttendance::where('resource_id', $resource->id)->where('student_id', $student->id)->where('attended', true)->exists())->toBeTrue();
    expect(app(ProgressEngine::class)->isResourceComplete($student->fresh(), $resource->fresh()))->toBeTrue();
});

it('points a late student at the recording instead of a bare "session has ended"', function (): void {
    ['student' => $student, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource, 'https://drive.google.com/file/d/abc123/view');

    // getJson, not get: a plain request lets the abort bubble as an HttpException instead of
    // being rendered as the JSON 403 an API client actually receives.
    $response = $this->actingAs($student)->getJson("/api/v1/resources/{$resource->id}/join");

    $response->assertForbidden();
    // This API wraps failures as {error: {code, message}}, not a bare {message}.
    expect($response->json('error.message'))->toContain('recording');
});

it('lists past sessions missing a recording for admins, and drops them once one is attached', function (): void {
    ['admin' => $admin, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource);

    $this->actingAs($admin)->getJson('/api/v1/admin/live-sessions/missing-recordings')
        ->assertOk()
        ->assertJsonPath('data.0.resource_id', $resource->id);

    $this->actingAs($admin)->patchJson("/api/v1/resources/{$resource->id}", [
        'recording_url' => 'https://zoom.us/rec/share/abc123',
    ])->assertOk();

    $this->actingAs($admin)->getJson('/api/v1/admin/live-sessions/missing-recordings')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('does not flag a session that has not happened yet as missing its recording', function (): void {
    ['admin' => $admin, 'resource' => $resource] = recordingTestCourse();
    $resource->liveSession()->update([
        'scheduled_at' => now()->addDays(3),
        'duration_minutes' => 60,
        'recording_url' => null,
    ]);

    $this->actingAs($admin)->getJson('/api/v1/admin/live-sessions/missing-recordings')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('issues the certificate when the course is finished through a recording', function (): void {
    // The certificate job would otherwise try to render and upload a PDF during the test.
    Illuminate\Support\Facades\Bus::fake();

    ['student' => $student, 'course' => $course, 'resource' => $resource] = recordingTestCourse();
    sessionHasPassed($resource, 'https://drive.google.com/file/d/abc123/view');

    // The live session is the course's only required item, so watching the recording is what
    // finishes the course — the dead end this feature exists to remove.
    $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-opened")->assertSuccessful();

    expect(App\Models\Certificate::where('student_id', $student->id)->where('course_id', $course->id)->exists())->toBeTrue();
});
