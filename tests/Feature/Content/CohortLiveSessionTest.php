<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\ModuleProgressStatus;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Resource;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Testing\TestResponse;

/**
 * A live session can be tied to one cohort, so a course that runs in several intakes can have a
 * session per intake, each with its own date, link and attendance list. A session with no cohort
 * stays "for everyone taking the course".
 */
beforeEach(function (): void {
    Bus::fake();
});

/**
 * A course running in two intakes that have both begun, so a student in either can open content.
 *
 * @return array{admin: User, course: Course, module: Module, september: Cohort, january: Cohort, septemberOffering: CohortCourse, januaryOffering: CohortCourse}
 */
function courseInTwoCohorts(): array
{
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['title' => 'Frontend Development']);
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $september = Cohort::factory()->create([
        'name' => 'September Cohort',
        'start_date' => now()->subWeeks(3)->toDateString(),
        'end_date' => now()->addWeeks(5)->toDateString(),
    ]);
    $january = Cohort::factory()->create([
        'name' => 'January Cohort',
        'start_date' => now()->subWeek()->toDateString(),
        'end_date' => now()->addMonths(4)->toDateString(),
    ]);

    return [
        'admin' => $admin,
        'course' => $course,
        'module' => $module,
        'september' => $september,
        'january' => $january,
        'septemberOffering' => CohortCourse::factory()->for($course)->for($september)->open()->create(),
        'januaryOffering' => CohortCourse::factory()->for($course)->for($january)->open()->create(),
    ];
}

function enrolInCohort(User $student, Course $course, CohortCourse $offering): void
{
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $offering->id);
}

/**
 * A live session that is joinable right now, tied to a cohort (or to none), and a required item.
 */
function liveSessionFor(Module $module, ?Cohort $cohort, string $title): Resource
{
    $resource = Resource::factory()->for($module)->liveSession()->create(['title' => $title]);
    $resource->liveSession()->update([
        'cohort_id' => $cohort?->id,
        'scheduled_at' => now()->subMinutes(10),
        'duration_minutes' => 60,
    ]);

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'resource',
        'item_id' => $resource->id,
        'order_index' => (int) ModuleItem::where('module_id', $module->id)->max('order_index') + 1,
        'is_required' => true,
    ]);

    return $resource;
}

/**
 * @return array<string, mixed>
 */
function newLiveSessionPayload(string $scheduledAt, ?int $cohortId = null): array
{
    return [
        'type' => 'live_session',
        'title' => 'Week 1 live class',
        'provider' => 'zoom',
        'meeting_url' => 'https://zoom.us/j/123456789',
        'duration_minutes' => 60,
        'scheduled_at' => $scheduledAt,
        'cohort_id' => $cohortId,
    ];
}

function sessionRejectionFor(TestResponse $response, string $field): string
{
    $response->assertUnprocessable();
    $message = $response->json("error.fields.{$field}.0");
    expect($message)->not->toBeNull("expected a validation error on '{$field}'");

    return $message;
}

// ── Creating and editing ────────────────────────────────────────────────────────────────────

it('lets a live session be created for one cohort of a course that runs in two', function (): void {
    ['admin' => $admin, 'module' => $module, 'january' => $january] = courseInTwoCohorts();

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/modules/{$module->id}/resources",
        newLiveSessionPayload(now()->addMonths(3)->toIso8601String(), $january->id),
    );

    $response->assertCreated();
    $response->assertJsonPath('data.details.cohort_id', $january->id);
    $response->assertJsonPath('data.details.cohort_name', 'January Cohort');
    $this->assertDatabaseHas('resource_live_sessions', ['resource_id' => $response->json('data.id'), 'cohort_id' => $january->id]);
});

it('tells the admin to choose a cohort when a multi-cohort course is given no cohort', function (): void {
    ['admin' => $admin, 'module' => $module] = courseInTwoCohorts();

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/modules/{$module->id}/resources",
        newLiveSessionPayload(now()->addWeeks(2)->toIso8601String()),
    );

    expect(sessionRejectionFor($response, 'scheduled_at'))
        ->toContain('runs in 2 cohorts')
        ->toContain('Choose the cohort this session is for');
});

it('checks the date against the chosen cohort only, not the other one', function (): void {
    ['admin' => $admin, 'module' => $module, 'september' => $september] = courseInTwoCohorts();

    // Three months out is inside the January cohort's range but well past the September one.
    $response = $this->actingAs($admin)->postJson(
        "/api/v1/modules/{$module->id}/resources",
        newLiveSessionPayload(now()->addMonths(3)->toIso8601String(), $september->id),
    );

    expect(sessionRejectionFor($response, 'scheduled_at'))->toContain('September Cohort');
});

it('rejects a cohort the course does not run in', function (): void {
    ['admin' => $admin, 'module' => $module] = courseInTwoCohorts();
    $other = Cohort::factory()->create(['name' => 'Unrelated Cohort']);

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/modules/{$module->id}/resources",
        newLiveSessionPayload(now()->addWeeks(2)->toIso8601String(), $other->id),
    );

    sessionRejectionFor($response, 'cohort_id');
});

it('re-checks the date when a session is moved to another cohort, even if the date is not resent', function (): void {
    ['admin' => $admin, 'module' => $module, 'september' => $september, 'january' => $january] = courseInTwoCohorts();

    // Two weeks ago is inside September's range but before January began.
    $session = liveSessionFor($module, $september, 'Sept class');
    $session->liveSession()->update(['scheduled_at' => now()->subWeeks(2)]);

    // That date is outside January's range, so moving the session must be refused.
    $refused = $this->actingAs($admin)->patchJson("/api/v1/resources/{$session->id}", ['cohort_id' => $january->id]);
    expect(sessionRejectionFor($refused, 'scheduled_at'))->toContain('January Cohort');

    // With a date that fits January, the move is fine.
    $this->actingAs($admin)->patchJson("/api/v1/resources/{$session->id}", [
        'cohort_id' => $january->id,
        'scheduled_at' => now()->addMonths(3)->toIso8601String(),
    ])->assertSuccessful();

    expect($session->liveSession()->first()->cohort_id)->toBe($january->id);
});

// ── What each cohort's students see ─────────────────────────────────────────────────────────

it('shows a student only the sessions run for their own cohort, plus any that are for everyone', function (): void {
    ['admin' => $admin, 'course' => $course, 'module' => $module, 'september' => $september, 'january' => $january, 'septemberOffering' => $sepOffering] = courseInTwoCohorts();

    liveSessionFor($module, $september, 'September class');
    liveSessionFor($module, $january, 'January class');
    liveSessionFor($module, null, 'Everyone class');

    $student = User::factory()->student()->create();
    enrolInCohort($student, $course, $sepOffering);

    $titles = fn ($response) => collect($response->json('data.0.items'))->pluck('title')->all();

    $asStudent = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/modules");
    expect($titles($asStudent))->toEqualCanonicalizing(['September class', 'Everyone class']);

    // An admin manages every one of them.
    $asAdmin = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/modules");
    expect($titles($asAdmin))->toEqualCanonicalizing(['September class', 'January class', 'Everyone class']);
});

it('does not let a student open another cohort\'s session directly', function (): void {
    ['course' => $course, 'module' => $module, 'september' => $september, 'january' => $january, 'septemberOffering' => $sepOffering] = courseInTwoCohorts();

    $own = liveSessionFor($module, $september, 'September class');
    $other = liveSessionFor($module, $january, 'January class');

    $student = User::factory()->student()->create();
    enrolInCohort($student, $course, $sepOffering);

    $this->actingAs($student)->getJson("/api/v1/resources/{$own->id}")->assertOk();
    $this->actingAs($student)->getJson("/api/v1/resources/{$other->id}")->assertNotFound();
});

// ── Joining and completing ──────────────────────────────────────────────────────────────────

it('lets a student join their own cohort\'s session but not another cohort\'s', function (): void {
    ['course' => $course, 'module' => $module, 'september' => $september, 'january' => $january, 'septemberOffering' => $sepOffering] = courseInTwoCohorts();

    $own = liveSessionFor($module, $september, 'September class');
    $other = liveSessionFor($module, $january, 'January class');

    $student = User::factory()->student()->create();
    enrolInCohort($student, $course, $sepOffering);

    $this->actingAs($student)->get("/api/v1/resources/{$own->id}/join")->assertRedirect($own->liveSession->meeting_url);
    $this->actingAs($student)->get("/api/v1/resources/{$other->id}/join")->assertForbidden();
});

it('completes the module once a student attends their own cohort\'s session, without needing the other cohort\'s', function (): void {
    ['course' => $course, 'module' => $module, 'september' => $september, 'january' => $january, 'septemberOffering' => $sepOffering] = courseInTwoCohorts();

    $own = liveSessionFor($module, $september, 'September class');
    liveSessionFor($module, $january, 'January class');   // required, but not this student's

    $student = User::factory()->student()->create();
    enrolInCohort($student, $course, $sepOffering);

    $this->actingAs($student)->get("/api/v1/resources/{$own->id}/join")->assertRedirect();

    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::Completed);
});

// ── Attendance list ─────────────────────────────────────────────────────────────────────────

it('lists only the session\'s own cohort on its attendance roster', function (): void {
    ['admin' => $admin, 'course' => $course, 'module' => $module, 'september' => $september, 'septemberOffering' => $sepOffering, 'januaryOffering' => $janOffering] = courseInTwoCohorts();

    $session = liveSessionFor($module, $september, 'September class');

    $septemberStudent = User::factory()->student()->create();
    $januaryStudent = User::factory()->student()->create();
    enrolInCohort($septemberStudent, $course, $sepOffering);
    enrolInCohort($januaryStudent, $course, $janOffering);

    $roster = $this->actingAs($admin)->getJson("/api/v1/resources/{$session->id}/attendance");

    $roster->assertOk();
    expect(collect($roster->json('data'))->pluck('student.id')->all())->toBe([$septemberStudent->id]);
});

it('lists every enrolled student on the roster of a session that is for everyone', function (): void {
    ['admin' => $admin, 'course' => $course, 'module' => $module, 'septemberOffering' => $sepOffering, 'januaryOffering' => $janOffering] = courseInTwoCohorts();

    $session = liveSessionFor($module, null, 'Everyone class');

    $a = User::factory()->student()->create();
    $b = User::factory()->student()->create();
    enrolInCohort($a, $course, $sepOffering);
    enrolInCohort($b, $course, $janOffering);

    $roster = $this->actingAs($admin)->getJson("/api/v1/resources/{$session->id}/attendance");

    expect(collect($roster->json('data'))->pluck('student.id')->all())->toEqualCanonicalizing([$a->id, $b->id]);
});

// ── Housekeeping ────────────────────────────────────────────────────────────────────────────

it('refuses to delete a cohort that still has live sessions assigned to it', function (): void {
    ['admin' => $admin, 'module' => $module, 'january' => $january] = courseInTwoCohorts();

    liveSessionFor($module, $january, 'January class');

    // Cohorts with enrolment history are refused for their own reason; this one has none, so
    // only the live session stands in the way.
    $response = $this->actingAs($admin)->deleteJson("/api/v1/cohorts/{$january->id}");

    $response->assertUnprocessable();
    expect($response->json('error.fields.cohort.0'))->toContain('live sessions');
    $this->assertDatabaseHas('cohorts', ['id' => $january->id]);
});
