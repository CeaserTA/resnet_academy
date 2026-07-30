<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Module;
use App\Models\User;

/**
 * Regression: `EvaluationController::store()` had the same bug as `AssignmentController::store()`
 * — no `Module $module` parameter, so route-model binding never resolved `{module}` before
 * `StoreEvaluationRequest::authorize()` ran, crashing the policy with a raw string instead of a
 * `Module` instance (500 on every attempt to add an evaluation/quiz).
 */
it('lets an admin add an evaluation to a module', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/evaluations", [
        'title' => 'Module 1 Quiz',
        'pass_score' => 70,
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('evaluations', ['module_id' => $module->id, 'title' => 'Module 1 Quiz']);
});

it('denies an instructor from adding an evaluation to a module they do not teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($instructor)->postJson("/api/v1/modules/{$module->id}/evaluations", [
        'title' => 'Module 1 Quiz',
        'pass_score' => 70,
    ]);

    $response->assertForbidden();
});
