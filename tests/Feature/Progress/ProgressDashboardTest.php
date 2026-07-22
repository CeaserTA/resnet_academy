<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Course;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('summarizes a completed course with its certificate and an in-progress course separately', function (): void {
    $student = User::factory()->student()->create();

    $completedCourse = Course::factory()->create(['title' => 'Finished Course']);
    $completedModule = Module::factory()->for($completedCourse)->create(['order_index' => 1]);
    $completedResource = Resource::factory()->for($completedModule)->reading()->create();
    ModuleItem::create(['module_id' => $completedModule->id, 'item_type' => 'resource', 'item_id' => $completedResource->id, 'order_index' => 1, 'is_required' => true]);

    $inProgressCourse = Course::factory()->create(['title' => 'Ongoing Course']);
    $inProgressModule1 = Module::factory()->for($inProgressCourse)->create(['order_index' => 1]);
    $inProgressResource1 = Resource::factory()->for($inProgressModule1)->reading()->create();
    ModuleItem::create(['module_id' => $inProgressModule1->id, 'item_type' => 'resource', 'item_id' => $inProgressResource1->id, 'order_index' => 1, 'is_required' => true]);
    $inProgressModule2 = Module::factory()->for($inProgressCourse)->create(['order_index' => 2]);
    $inProgressResource2 = Resource::factory()->for($inProgressModule2)->reading()->create();
    ModuleItem::create(['module_id' => $inProgressModule2->id, 'item_type' => 'resource', 'item_id' => $inProgressResource2->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $completedCourse, EnrolmentSource::Self);
    app(EnrolmentService::class)->enrol($student, $inProgressCourse, EnrolmentSource::Self);

    app(ProgressEngine::class)->markRead($student, $completedResource);
    app(ProgressEngine::class)->markRead($student, $inProgressResource1);

    $response = $this->actingAs($student)->getJson('/api/v1/me/progress');

    $response->assertOk();
    $rows = collect($response->json('data'));

    // PHP's json_encode drops the trailing .0 on whole floats, so these decode as ints.
    $completedRow = $rows->firstWhere('course.title', 'Finished Course');
    expect($completedRow['status'])->toBe('completed');
    expect($completedRow['percent_complete'])->toBe(100);
    expect($completedRow['certificate'])->not->toBeNull();

    $inProgressRow = $rows->firstWhere('course.title', 'Ongoing Course');
    expect($inProgressRow['status'])->toBe('in_progress');
    expect($inProgressRow['percent_complete'])->toBe(50);
    expect($inProgressRow['certificate'])->toBeNull();
});
