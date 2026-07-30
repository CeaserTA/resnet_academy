<?php

declare(strict_types=1);

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Module;
use App\Models\User;

/**
 * Regression: `AssignmentController::store()` used to omit the `Module $module` parameter, so
 * Laravel's route-model binding never resolved `{module}` before `StoreAssignmentRequest::
 * authorize()` ran — `$this->route('module')` was still the raw string id, which crashed the
 * policy's type-hinted `Module $module` argument with a 500 on every attempt to add an
 * assignment.
 */
it('lets an admin add an assignment to a module', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Essay 1',
        'submission_type' => 'file',
        'max_score' => 100,
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('assignments', ['module_id' => $module->id, 'title' => 'Essay 1']);
});

it('lets the teaching instructor add an assignment to their module', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($instructor)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Essay 1',
        'submission_type' => 'file',
        'max_score' => 100,
    ]);

    $response->assertCreated();
});

it('denies an instructor from adding an assignment to a module they do not teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($instructor)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Essay 1',
        'submission_type' => 'file',
        'max_score' => 100,
    ]);

    $response->assertForbidden();
});

it('denies a student from adding an assignment', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($student)->postJson("/api/v1/modules/{$module->id}/assignments", [
        'title' => 'Essay 1',
        'submission_type' => 'file',
        'max_score' => 100,
    ]);

    $response->assertForbidden();
});

it('updates and deletes an assignment', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->for($course)->create();
    $assignment = Assignment::factory()->for($module)->create();

    $this->actingAs($admin)
        ->patchJson("/api/v1/assignments/{$assignment->id}", ['title' => 'Updated title'])
        ->assertOk();
    expect($assignment->fresh()->title)->toBe('Updated title');

    $this->actingAs($admin)->deleteJson("/api/v1/assignments/{$assignment->id}")->assertNoContent();
    $this->assertDatabaseMissing('assignments', ['id' => $assignment->id]);
});
