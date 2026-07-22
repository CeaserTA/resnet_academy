<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\GroupsCohort;
use App\Models\Module;
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
