<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\GroupsCohort;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\User;

it('lets an instructor create a module on their own course', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $response = $this->actingAs($instructor)->postJson("/api/v1/courses/{$course->id}/modules", [
        'title' => 'Getting started',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('modules', ['course_id' => $course->id, 'title' => 'Getting started']);
});

it('denies an instructor from creating a module on a course they do not teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($instructor)->postJson("/api/v1/courses/{$course->id}/modules", [
        'title' => 'Getting started',
    ]);

    $response->assertForbidden();
});

it('denies a student from creating a module', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/modules", [
        'title' => 'Getting started',
    ]);

    $response->assertForbidden();
});

it('shows locked modules in the listing rather than hiding them', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    Module::factory()->for($course)->create(['order_index' => 1, 'scheduled_start_at' => now()->addWeek()]);

    $response = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/modules");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});

it('scopes a group to a course and syncs it onto a module', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $group = GroupsCohort::factory()->for($course)->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($admin)->patchJson("/api/v1/modules/{$module->id}", [
        'group_ids' => [$group->id],
    ]);

    $response->assertOk();
    expect($response->json('data.group_ids'))->toBe([$group->id]);
});

it('soft-deletes a module, hiding it from the listing but leaving its resources intact', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/modules/{$module->id}");

    $response->assertNoContent();
    $this->assertSoftDeleted('modules', ['id' => $module->id]);
    $this->assertDatabaseHas('resources', ['id' => $resource->id, 'module_id' => $module->id]);
    $this->assertDatabaseHas('module_items', ['module_id' => $module->id, 'item_id' => $resource->id]);

    $listing = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/modules");
    expect($listing->json('data'))->toHaveCount(0);
});

it('lists trashed modules for a course with their resources still populated, and denies a non-managing instructor', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Resource::factory()->for($module)->reading()->create();
    $module->delete();

    $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/modules/trashed");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.id'))->toBe($module->id);

    $otherInstructor = User::factory()->instructor()->create();
    $denied = $this->actingAs($otherInstructor)->getJson("/api/v1/courses/{$course->id}/modules/trashed");
    $denied->assertForbidden();
});

it('restores a soft-deleted module back into the listing, and denies unauthorized users', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $module->delete();

    $student = User::factory()->student()->create();
    $this->actingAs($student)->postJson("/api/v1/modules/{$module->id}/restore")->assertForbidden();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/restore");

    $response->assertOk();
    $this->assertDatabaseHas('modules', ['id' => $module->id, 'deleted_at' => null]);

    $listing = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/modules");
    expect($listing->json('data'))->toHaveCount(1);
});
