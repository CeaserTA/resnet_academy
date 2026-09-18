<?php

declare(strict_types=1);

use App\Models\Assignment;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Testing\TestResponse;

/**
 * This API renders validation failures as {error: {code, message, fields}} (bootstrap/app.php),
 * so Laravel's assertJsonValidationErrors() does not apply.
 */
function assertRejectedFor(TestResponse $response, string $field): string
{
    $response->assertUnprocessable();
    $message = $response->json("error.fields.{$field}.0");
    expect($message)->not->toBeNull("expected a validation error on '{$field}'");

    return $message;
}

beforeEach(function (): void {
    Bus::fake();
});

/**
 * A course offered in one intake running 1 Mar 2027 – 30 Jun 2027.
 *
 * @return array{0: User, 1: Course, 2: Module, 3: Cohort}
 */
function courseInOneCohort(): array
{
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['title' => 'Frontend Development']);
    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    $cohort = Cohort::factory()->create([
        'name' => 'March 2027 Intake',
        'start_date' => '2027-03-01',
        'end_date' => '2027-06-30',
    ]);
    CohortCourse::factory()->for($course)->for($cohort)->open()->create();

    return [$admin, $course, $module, $cohort];
}

// ── Inside the range: nothing changes ───────────────────────────────────────────────────────

it('accepts a live session, assignment and evaluation dated inside the cohort range', function (): void {
    [$admin, , $module] = courseInOneCohort();

    $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'live_session',
        'title' => 'Week 2 workshop',
        'provider' => 'zoom',
        'meeting_url' => 'https://zoom.us/j/123456789',
        'duration_minutes' => 60,
        'scheduled_at' => '2027-03-15T14:00:00Z',
    ])->assertCreated();

    $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Portfolio piece',
        'instructions' => 'Build a landing page.',
        'submission_type' => 'file',
        'max_score' => 100,
        'due_at' => '2027-04-20T23:59:00Z',
    ])->assertCreated();

    $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/evaluations", [
        'title' => 'Final quiz',
        'pass_score' => 50,
        'max_attempts' => 1,
        'available_from' => '2027-06-01T00:00:00Z',
        'available_until' => '2027-06-20T23:59:00Z',
    ])->assertCreated();
});

// ── Outside the range: rejected with the range spelled out ──────────────────────────────────

it('rejects a live session scheduled before the cohort begins', function (): void {
    [$admin, , $module] = courseInOneCohort();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'live_session',
        'title' => 'Too early',
        'provider' => 'zoom',
        'meeting_url' => 'https://zoom.us/j/123456789',
        'duration_minutes' => 60,
        'scheduled_at' => '2027-01-10T14:00:00Z',
    ]);

    expect(assertRejectedFor($response, 'scheduled_at'))
        ->toContain('March 2027 Intake')
        ->toContain('1 Mar 2027')
        ->toContain('30 Jun 2027');
});

it('rejects an assignment due after the cohort ends', function (): void {
    [$admin, , $module] = courseInOneCohort();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Too late',
        'instructions' => 'Build a landing page.',
        'submission_type' => 'file',
        'max_score' => 100,
        'due_at' => '2027-09-01T23:59:00Z',
    ]);

    assertRejectedFor($response, 'due_at');
});

it('rejects an evaluation window that runs past the cohort end', function (): void {
    [$admin, , $module] = courseInOneCohort();

    assertRejectedFor($this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/evaluations", [
        'title' => 'Overruns',
        'pass_score' => 50,
        'max_attempts' => 1,
        'available_from' => '2027-06-01T00:00:00Z',
        'available_until' => '2027-08-01T00:00:00Z',
    ]), 'available_until');
});

it('rejects a module scheduled outside the cohort range', function (): void {
    [$admin, $course] = courseInOneCohort();

    assertRejectedFor($this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/modules", [
        'title' => 'Way ahead',
        'order_index' => 2,
        'scheduled_start_at' => '2028-01-01T00:00:00Z',
    ]), 'scheduled_start_at');
});

it('applies the same rule when editing, not only when creating', function (): void {
    [$admin, , $module] = courseInOneCohort();

    $assignment = Assignment::factory()->for($module)->create(['due_at' => '2027-04-01T12:00:00Z']);

    assertRejectedFor($this->actingAs($admin)->patchJson("/api/v1/assignments/{$assignment->id}", [
        'due_at' => '2027-12-01T12:00:00Z',
    ]), 'due_at');

    $this->actingAs($admin)->patchJson("/api/v1/assignments/{$assignment->id}", [
        'due_at' => '2027-05-01T12:00:00Z',
    ])->assertSuccessful();
});

// ── A course reused across intakes ──────────────────────────────────────────────────────────

it('refuses a fixed date when the course runs in more than one cohort, naming them', function (): void {
    [$admin, $course, $module] = courseInOneCohort();

    $second = Cohort::factory()->create([
        'name' => 'September 2027 Intake',
        'start_date' => '2027-09-06',
        'end_date' => '2027-12-15',
    ]);
    CohortCourse::factory()->for($course)->for($second)->open()->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'live_session',
        'title' => 'Which intake is this for?',
        'provider' => 'zoom',
        'meeting_url' => 'https://zoom.us/j/123456789',
        'duration_minutes' => 60,
        // Valid for the March intake, impossible for the September one.
        'scheduled_at' => '2027-03-15T14:00:00Z',
    ]);

    expect(assertRejectedFor($response, 'scheduled_at'))
        ->toContain('runs in 2 cohorts')
        ->toContain('March 2027 Intake')
        ->toContain('September 2027 Intake');
});

// ── No intake at all ────────────────────────────────────────────────────────────────────────

it('leaves a course with no cohort free to use any date', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'live_session',
        'title' => 'Self-paced session',
        'provider' => 'zoom',
        'meeting_url' => 'https://zoom.us/j/123456789',
        'duration_minutes' => 60,
        'scheduled_at' => '2030-01-01T14:00:00Z',
    ])->assertCreated();
});

it('ignores a cohort_courses row that predates cohorts and carries no schedule', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    CohortCourse::factory()->for($course)->open()->create(['cohort_id' => null]);

    $evaluation = Evaluation::factory()->for($module)->create();

    $this->actingAs($admin)->patchJson("/api/v1/evaluations/{$evaluation->id}", [
        'available_from' => '2031-01-01T00:00:00Z',
    ])->assertSuccessful();
});
