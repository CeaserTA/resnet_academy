<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\ModuleProgressStatus;
use App\Models\Course;
use App\Models\GroupsCohort;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Notification;
use App\Models\Resource;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;
use Symfony\Component\HttpKernel\Exception\HttpException;

function statusFor(User $student, Module $module): ModuleProgressStatus
{
    return ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->firstOrFail()->status;
}

function makeRequiredResourceItem(Module $module): ModuleItem
{
    $resource = Resource::factory()->for($module)->reading()->create();

    return ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'resource',
        'item_id' => $resource->id,
        'order_index' => 1,
        'is_required' => true,
    ]);
}

beforeEach(function (): void {
    Bus::fake();
});

it('unlocks module 1 immediately on enrolment when no schedule is set', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    expect(statusFor($student, $module1))->toBe(ModuleProgressStatus::NotStarted);
});

it('locks module 2 until module 1 is completed even if scheduled_start_at has passed', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1]);
    $module2 = Module::factory()->for($course)->create(['order_index' => 2, 'scheduled_start_at' => now()->subDay()]);
    makeRequiredResourceItem($module1);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    expect(statusFor($student, $module2))->toBe(ModuleProgressStatus::Locked);
});

it('unlocks module 2 once module 1 completes, its own schedule already having passed', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1]);
    $module2 = Module::factory()->for($course)->create(['order_index' => 2, 'scheduled_start_at' => now()->subDay()]);
    $item = makeRequiredResourceItem($module1);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $item->resolveItem());

    expect(statusFor($student, $module1))->toBe(ModuleProgressStatus::Completed);
    expect(statusFor($student, $module2))->toBe(ModuleProgressStatus::NotStarted);
});

it('keeps a module locked until its own scheduled_start_at passes, even with no prior module', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    Module::factory()->for($course)->create(['order_index' => 1, 'scheduled_start_at' => now()->addWeek()]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $module = $course->modules()->first();
    expect(statusFor($student, $module))->toBe(ModuleProgressStatus::Locked);
});

it('does not let a group-scoped module block a students sequence when they are not a member', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1]);
    $module2 = Module::factory()->for($course)->create(['order_index' => 2]);
    $module3 = Module::factory()->for($course)->create(['order_index' => 3]);
    makeRequiredResourceItem($module1);

    $otherGroup = GroupsCohort::factory()->for($course)->create();
    $module2->groups()->attach($otherGroup->id);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    $item1 = ModuleItem::where('module_id', $module1->id)->first();
    app(ProgressEngine::class)->markRead($student, $item1->resolveItem());

    // module2 is scoped to a group this student isn't in, so it's skipped entirely — the
    // student's sequence goes straight to module3 unlocking.
    expect(ModuleProgress::where('student_id', $student->id)->where('module_id', $module2->id)->exists())->toBeFalse();
    expect(statusFor($student, $module3))->toBe(ModuleProgressStatus::NotStarted);
});

it('rejects a progress action on a resource whose module is still locked', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1, 'scheduled_start_at' => now()->addWeek()]);
    $resource = Resource::factory()->for($module1)->reading()->create();

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    expect(fn () => app(ProgressEngine::class)->markRead($student, $resource))
        ->toThrow(HttpException::class);
});

it('notifies the student when a module unlocks, exactly once per transition', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module1 = Module::factory()->for($course)->create(['order_index' => 1]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    expect(Notification::where('user_id', $student->id)->where('type', 'module_unlocked')->count())->toBe(1);

    // Re-evaluating unlocks again (e.g. the scheduled sweep) must not notify a second time —
    // the module is already unlocked, so there's no new transition to report.
    app(ProgressEngine::class)->evaluateCourseUnlocks($student, $course);
    expect(Notification::where('user_id', $student->id)->where('type', 'module_unlocked')->count())->toBe(1);
});
