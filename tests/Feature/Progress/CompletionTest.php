<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\ModuleProgressStatus;
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

it('only completes a video once watch percent reaches 90', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    $resource = Resource::factory()->for($module)->video()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    $engine = app(ProgressEngine::class);

    $engine->recordVideoPing($student, $resource, 200); // 200/600 = 33%
    expect($engine->isResourceComplete($student, $resource))->toBeFalse();

    $engine->recordVideoPing($student, $resource, 550); // 550/600 = 91.6%
    expect($engine->isResourceComplete($student, $resource))->toBeTrue();

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);
});

it('does not let an optional resource block module completion', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $required = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $required->id, 'order_index' => 1, 'is_required' => true]);

    $optional = Resource::factory()->for($module)->externalLink()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $optional->id, 'order_index' => 2, 'is_required' => false]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $required);

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);
});

it('does not complete a module while a required resource is still incomplete', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $first = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $first->id, 'order_index' => 1, 'is_required' => true]);

    $second = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $second->id, 'order_index' => 2, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $first);

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::NotStarted);
});
