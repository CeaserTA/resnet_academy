<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\EvaluationAttemptStatus;
use App\Enums\SubmissionStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\Module;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

it('aggregates assignment and evaluation grades per student with a computed final grade', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $module = Module::factory()->for($course)->create();

    $assignment = Assignment::factory()->for($module)->create(['max_score' => 100]);
    AssignmentSubmission::factory()->for($assignment)->create([
        'student_id' => $student->id,
        'attempt_number' => 1,
        'status' => SubmissionStatus::Graded,
        'raw_score' => 80,
        'final_score' => 80,
    ]);

    $evaluation = Evaluation::factory()->for($module)->create(['pass_score' => 70]);
    EvaluationAttempt::factory()->for($evaluation)->create([
        'student_id' => $student->id,
        'attempt_number' => 1,
        'status' => EvaluationAttemptStatus::Graded,
        'score_percent' => 60,
        'passed' => false,
    ]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($instructor)->getJson("/api/v1/courses/{$course->id}/gradebook");

    $response->assertOk();
    $response->assertJsonPath('data.students.0.student.id', $student->id);
    $response->assertJsonPath('data.students.0.assignment_scores.0.final_score', 80);
    $response->assertJsonPath('data.students.0.evaluation_scores.0.best_score_percent', 60);
    // (80 + 60) / (100 + 100) * 100 = 70.0 — PHP's json_encode drops the trailing .0 on whole floats.
    $response->assertJsonPath('data.students.0.final_grade_percent', 70);
});

it('denies a student from viewing the gradebook', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);

    $response = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/gradebook");

    $response->assertForbidden();
});
