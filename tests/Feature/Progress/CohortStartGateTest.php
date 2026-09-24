<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
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
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

/**
 * A student enrolled on $course through an intake starting on $startDate.
 *
 * @return array{0: User, 1: Course, 2: Module, 3: Resource}
 */
function studentInCohortStarting(string $startDate): array
{
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['title' => 'Frontend Development']);
    $module = Module::factory()->for($course)->create(['order_index' => 1, 'scheduled_start_at' => null, 'unlock_offset_days' => null]);
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'resource',
        'item_id' => $resource->id,
        'order_index' => 1,
        'is_required' => true,
    ]);

    $cohort = Cohort::factory()->create(['name' => 'January Intake', 'start_date' => $startDate, 'end_date' => now()->parse($startDate)->addMonths(4)]);
    $cohortCourse = CohortCourse::factory()->for($course)->for($cohort)->open()->create();

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

    return [$student, $course, $module, $resource];
}

// ── Access timing ───────────────────────────────────────────────────────────────────────────

it('enrols a student straight away but keeps content locked until the cohort starts', function (): void {
    [$student, $course, $module] = studentInCohortStarting(now()->addMonths(3)->toDateString());

    // The seat is reserved: enrolling still succeeds immediately.
    expect($course->enrolments()->where('student_id', $student->id)->where('status', EnrolmentStatus::Confirmed)->exists())
        ->toBeTrue();

    // The content is not.
    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::Locked);
});

it('tells the student the date instead of just refusing', function (): void {
    [$student, , , $resource] = studentInCohortStarting(now()->addMonths(3)->toDateString());

    $response = $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-read");

    $response->assertForbidden();
    expect($response->json('error.message'))
        ->toContain('This course starts on')
        ->toContain(now()->addMonths(3)->format('j M Y'));
});

it('unlocks content once the cohort start date arrives', function (): void {
    [$student, $course, $module] = studentInCohortStarting(now()->addDays(10)->toDateString());

    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::Locked);

    $this->travel(11)->days();
    app(ProgressEngine::class)->evaluateCourseUnlocks($student->fresh(), $course);

    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::NotStarted);
});

it('leaves a cohort that has already started working exactly as before', function (): void {
    [$student, , $module, $resource] = studentInCohortStarting(now()->subWeek()->toDateString());

    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::NotStarted);

    $this->actingAs($student)->postJson("/api/v1/resources/{$resource->id}/progress/mark-read")->assertSuccessful();
});

it('re-locks a module that was opened before the cohort start rule applied', function (): void {
    [$student, $course, $module] = studentInCohortStarting(now()->addMonths(2)->toDateString());

    // Simulate a row unlocked by the older rule, which ignored the cohort start date.
    ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->update([
        'status' => ModuleProgressStatus::NotStarted,
        'unlocked_at' => now(),
    ]);

    app(ProgressEngine::class)->evaluateCourseUnlocks($student, $course);

    $progress = ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first();
    expect($progress->status)->toBe(ModuleProgressStatus::Locked)
        ->and($progress->unlocked_at)->toBeNull();
});

it('reports the course as upcoming on the dashboard, with the date it opens', function (): void {
    [$student] = studentInCohortStarting(now()->addMonths(3)->toDateString());

    $response = $this->actingAs($student)->getJson('/api/v1/me/progress');

    $response->assertOk();
    expect($response->json('data.0.status'))->toBe('upcoming')
        ->and($response->json('data.0.starts_on'))->toBe(now()->addMonths(3)->toDateString());
});

it('leaves a self-paced enrolment ungated, since it has no intake to wait for', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1, 'scheduled_start_at' => null]);

    // A cohort_courses row predating cohorts carries no cohort, so it carries no schedule.
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create(['cohort_id' => null]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status)
        ->toBe(ModuleProgressStatus::NotStarted);
});
