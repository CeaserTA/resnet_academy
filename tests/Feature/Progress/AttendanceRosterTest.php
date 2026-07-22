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

it('lets the course instructor see who attended a live session and who did not', function (): void {
    $instructor = User::factory()->instructor()->create();
    $attended = User::factory()->student()->create();
    $absent = User::factory()->student()->create();

    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    $module = Module::factory()->for($course)->create();
    $resource = Resource::factory()->for($module)->liveSession()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => false]);

    app(EnrolmentService::class)->enrol($attended, $course, EnrolmentSource::Self);
    app(EnrolmentService::class)->enrol($absent, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markAttendance($attended, $resource);

    $response = $this->actingAs($instructor)->getJson("/api/v1/resources/{$resource->id}/attendance");

    $response->assertOk();
    $roster = collect($response->json('data'))->keyBy('student.id');

    expect($roster[$attended->id]['attended'])->toBeTrue();
    expect($roster[$absent->id]['attended'])->toBeFalse();
});

it('denies a student from viewing the attendance roster', function (): void {
    $student = User::factory()->student()->create();
    $module = Module::factory()->create();
    $resource = Resource::factory()->for($module)->liveSession()->create();

    $response = $this->actingAs($student)->getJson("/api/v1/resources/{$resource->id}/attendance");

    $response->assertForbidden();
});

it('rejects the attendance roster for a resource that is not a live session', function (): void {
    $admin = User::factory()->admin()->create();
    $module = Module::factory()->create();
    $resource = Resource::factory()->for($module)->reading()->create();

    $response = $this->actingAs($admin)->getJson("/api/v1/resources/{$resource->id}/attendance");

    $response->assertStatus(422);
});
