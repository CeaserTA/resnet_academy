<?php

declare(strict_types=1);

use App\Enums\EvaluationAttemptStatus;
use App\Enums\SubmissionStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\Module;
use App\Models\User;

function gradingQueueFixture(): array
{
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $taught = Course::factory()->create(['created_by' => $admin->id]);
    $taught->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    $other = Course::factory()->create(['created_by' => $admin->id]);

    $module = Module::factory()->for($taught)->create();
    $assignment = Assignment::factory()->for($module)->create();
    $evaluation = Evaluation::factory()->for($module)->create();
    $otherAssignment = Assignment::factory()->for(Module::factory()->for($other)->create())->create();

    // Waiting for a mark.
    AssignmentSubmission::factory()->for($assignment)->create([
        'student_id' => $student->id, 'attempt_number' => 1, 'status' => SubmissionStatus::Submitted, 'submitted_at' => now()->subDay(),
    ]);
    EvaluationAttempt::factory()->for($evaluation)->create([
        'student_id' => $student->id, 'attempt_number' => 1, 'status' => EvaluationAttemptStatus::Submitted, 'submitted_at' => now()->subHours(2),
    ]);
    // Already marked — never listed.
    AssignmentSubmission::factory()->for($assignment)->create([
        'student_id' => User::factory()->student()->create()->id, 'attempt_number' => 1, 'status' => SubmissionStatus::Graded, 'raw_score' => 50, 'final_score' => 50,
    ]);
    // In a course the instructor doesn't teach.
    AssignmentSubmission::factory()->for($otherAssignment)->create([
        'student_id' => $student->id, 'attempt_number' => 1, 'status' => SubmissionStatus::Submitted, 'submitted_at' => now()->subDays(3),
    ]);

    return compact('admin', 'instructor', 'student', 'taught', 'other');
}

it('lists ungraded submissions and attempts for the courses an instructor teaches, oldest first', function (): void {
    ['instructor' => $instructor, 'taught' => $taught] = gradingQueueFixture();

    $response = $this->actingAs($instructor)->getJson('/api/v1/grading-queue');

    $response->assertOk()->assertJsonCount(2, 'data');
    $response->assertJsonPath('data.0.kind', 'assignment');
    $response->assertJsonPath('data.0.course.id', $taught->id);
    $response->assertJsonPath('data.1.kind', 'quiz');
});

it('shows admins every course and can be filtered to one', function (): void {
    ['admin' => $admin, 'other' => $other] = gradingQueueFixture();

    $this->actingAs($admin)->getJson('/api/v1/grading-queue')->assertOk()->assertJsonCount(3, 'data');
    $this->actingAs($admin)->getJson("/api/v1/grading-queue?course_id={$other->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.course.id', $other->id);
});

it('denies students', function (): void {
    ['student' => $student] = gradingQueueFixture();

    $this->actingAs($student)->getJson('/api/v1/grading-queue')->assertForbidden();
});
