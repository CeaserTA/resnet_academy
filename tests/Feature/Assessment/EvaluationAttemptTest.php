<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\ModuleProgressStatus;
use App\Enums\QuestionType;
use App\Models\Course;
use App\Models\CohortCourse;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\EvaluationAttemptAnswer;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

/**
 * @return array{admin: User, student: User, course: Course, module: Module, evaluation: Evaluation, question: Question, correctOption: QuestionOption, wrongOption: QuestionOption}
 */
function setUpEvaluationWithOneMcqQuestion(int $passScore = 70, ?int $maxAttempts = null): array
{
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $evaluation = Evaluation::factory()->for($module)->create([
        'pass_score' => $passScore,
        'max_attempts' => $maxAttempts,
    ]);

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'evaluation',
        'item_id' => $evaluation->id,
        'order_index' => 1,
        'is_required' => true,
    ]);

    $bank = QuestionBank::factory()->for($course)->create();
    $question = Question::factory()->for($bank, 'bank')->create([
        'type' => QuestionType::McqSingle,
        'points' => 10,
    ]);
    $correctOption = QuestionOption::factory()->for($question)->create(['is_correct' => true, 'order_index' => 0]);
    $wrongOption = QuestionOption::factory()->for($question)->create(['is_correct' => false, 'order_index' => 1]);

    $evaluation->questions()->attach($question->id, ['order_index' => 0]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, CohortCourse::factory()->for($course)->open()->create()->id);

    return compact('admin', 'student', 'course', 'module', 'evaluation', 'question', 'correctOption', 'wrongOption');
}

it('auto-grades an objective question and passes the module item when the score clears pass_score', function (): void {
    ['student' => $student, 'module' => $module, 'evaluation' => $evaluation, 'question' => $question, 'correctOption' => $correctOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70);

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $start->assertCreated();
    $attemptId = $start->json('data.attempt.id');

    $start->assertJsonMissingPath('data.questions.0.options.0.is_correct');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $question->id, 'selected_option_ids' => [$correctOption->id]],
        ],
    ]);

    $submit->assertOk();
    $submit->assertJsonPath('data.passed', true);
    $submit->assertJsonPath('data.score_percent', '100.00');

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);
});

it('does not pass the module item when the auto-graded score is below pass_score', function (): void {
    ['student' => $student, 'module' => $module, 'evaluation' => $evaluation, 'question' => $question, 'wrongOption' => $wrongOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70);

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $question->id, 'selected_option_ids' => [$wrongOption->id]],
        ],
    ]);

    $submit->assertOk();
    $submit->assertJsonPath('data.passed', false);

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()?->status ?? ModuleProgressStatus::NotStarted,
    )->not->toBe(ModuleProgressStatus::Completed);
});

it('does not let a later failing retake lower the pass bar once a student has passed', function (): void {
    ['student' => $student, 'module' => $module, 'evaluation' => $evaluation, 'question' => $question, 'correctOption' => $correctOption, 'wrongOption' => $wrongOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70, maxAttempts: 5);

    $firstAttempt = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $this->actingAs($student)->postJson("/api/v1/attempts/{$firstAttempt->json('data.attempt.id')}/submit", [
        'answers' => [['question_id' => $question->id, 'selected_option_ids' => [$correctOption->id]]],
    ])->assertJsonPath('data.passed', true);

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);

    $secondAttempt = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $this->actingAs($student)->postJson("/api/v1/attempts/{$secondAttempt->json('data.attempt.id')}/submit", [
        'answers' => [['question_id' => $question->id, 'selected_option_ids' => [$wrongOption->id]]],
    ])->assertJsonPath('data.passed', false);

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);
});

it('never exposes the answer key to a student, even via the evaluation detail endpoint', function (): void {
    ['student' => $student, 'evaluation' => $evaluation] = setUpEvaluationWithOneMcqQuestion();

    $response = $this->actingAs($student)->getJson("/api/v1/evaluations/{$evaluation->id}");

    $response->assertForbidden();
});

it('enforces the configured max_attempts limit', function (): void {
    ['student' => $student, 'evaluation' => $evaluation, 'question' => $question, 'wrongOption' => $wrongOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70, maxAttempts: 1);

    $first = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $this->actingAs($student)->postJson("/api/v1/attempts/{$first->json('data.attempt.id')}/submit", [
        'answers' => [['question_id' => $question->id, 'selected_option_ids' => [$wrongOption->id]]],
    ])->assertOk();

    $second = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");

    $second->assertForbidden();
});

it('rolls back every answer already written if a later answer in the same submit() fails', function (): void {
    ['student' => $student, 'evaluation' => $evaluation, 'question' => $question, 'correctOption' => $correctOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70);

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');
    $attempt = EvaluationAttempt::findOrFail($attemptId);

    // Called directly against the service (bypassing SubmitEvaluationAttemptRequest, which
    // already validates question_id with Rule::exists() and would reject this at the HTTP
    // layer before the service ever runs): the first answer references a real question and
    // would normally be written successfully, but the second references a question id that
    // doesn't exist, so Question::findOrFail() throws partway through the loop. The first
    // answer must not survive that.
    expect(fn () => app(App\Services\Assessment\EvaluationAttemptService::class)->submit($attempt, [
        ['question_id' => $question->id, 'selected_option_ids' => [$correctOption->id]],
        ['question_id' => 999999999, 'selected_option_ids' => []],
    ]))->toThrow(Illuminate\Database\Eloquent\ModelNotFoundException::class);

    expect(EvaluationAttemptAnswer::where('attempt_id', $attemptId)->count())->toBe(0)
        ->and(EvaluationAttempt::find($attemptId)->submitted_at)->toBeNull('the attempt itself must not show as submitted either');
});

it('rejects a second submit on an attempt that was already submitted', function (): void {
    ['student' => $student, 'evaluation' => $evaluation, 'question' => $question, 'correctOption' => $correctOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70);

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $answers = ['answers' => [['question_id' => $question->id, 'selected_option_ids' => [$correctOption->id]]]];

    $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", $answers)->assertOk();

    // The immutability guard now re-fetches and locks the attempt row inside the transaction
    // (rather than checking the caller's already-loaded instance) — this confirms that refactor
    // still rejects a resubmit and, critically, doesn't double-write the answer rows.
    $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", $answers)->assertUnprocessable();

    expect(EvaluationAttemptAnswer::where('attempt_id', $attemptId)->count())->toBe(1);
});

it('lets staff grant extra attempts once a student has used them all (BACKEND_CHANGES.md §3)', function (): void {
    ['admin' => $admin, 'student' => $student, 'evaluation' => $evaluation, 'question' => $question, 'wrongOption' => $wrongOption] =
        setUpEvaluationWithOneMcqQuestion(passScore: 70, maxAttempts: 1);

    $first = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $this->actingAs($student)->postJson("/api/v1/attempts/{$first->json('data.attempt.id')}/submit", [
        'answers' => [['question_id' => $question->id, 'selected_option_ids' => [$wrongOption->id]]],
    ])->assertOk();
    $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts")->assertForbidden();

    // A student can't grant themselves attempts.
    $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/students/{$student->id}/extra-attempts")->assertForbidden();

    $this->actingAs($admin)
        ->postJson("/api/v1/evaluations/{$evaluation->id}/students/{$student->id}/extra-attempts", ['attempts' => 1, 'reason' => 'Retry after revision'])
        ->assertOk()
        ->assertJsonPath('data.extra_attempts', 1)
        ->assertJsonPath('data.max_attempts', 2);

    $this->actingAs($student)->getJson("/api/v1/evaluations/{$evaluation->id}/overview")
        ->assertJsonPath('data.attempts_remaining', 1);
    $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts")->assertCreated();
});

it('refuses a new attempt while the last one is waiting for manual marking (BACKEND_CHANGES.md §2)', function (): void {
    ['student' => $student, 'evaluation' => $evaluation] = setUpEvaluationWithOneMcqQuestion(passScore: 70, maxAttempts: 3);

    EvaluationAttempt::create([
        'evaluation_id' => $evaluation->id,
        'student_id' => $student->id,
        'attempt_number' => 1,
        'started_at' => now()->subHour(),
        'submitted_at' => now()->subMinutes(30),
        'status' => \App\Enums\EvaluationAttemptStatus::Submitted,
    ]);

    $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts")
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Your last attempt is still waiting to be marked. You can try again once your instructor has graded it.']);
});
