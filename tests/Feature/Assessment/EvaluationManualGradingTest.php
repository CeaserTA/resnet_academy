<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\EvaluationAttemptStatus;
use App\Enums\QuestionType;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\EvaluationAttemptAnswer;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

/**
 * A student's score must stay hidden until every manually-graded (essay/short_answer) answer on
 * their attempt has actually been reviewed — no provisional score derived from a
 * partially-graded attempt should ever reach the student (see AttemptReviewResource and
 * EvaluationAttemptService::gradeManualAnswers()).
 *
 * @return array{admin: User, student: User, evaluation: Evaluation, questionOne: Question, questionTwo: Question}
 */
function setUpEvaluationWithTwoEssayQuestions(): array
{
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($admin->id, ['is_primary' => true, 'assigned_at' => now()]);
    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $evaluation = Evaluation::factory()->for($module)->create(['pass_score' => 50]);

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'evaluation',
        'item_id' => $evaluation->id,
        'order_index' => 1,
        'is_required' => true,
    ]);

    $bank = QuestionBank::factory()->for($course)->create();
    $questionOne = Question::factory()->for($bank, 'bank')->create(['type' => QuestionType::Essay, 'points' => 10, 'auto_gradable' => false]);
    $questionTwo = Question::factory()->for($bank, 'bank')->create(['type' => QuestionType::Essay, 'points' => 10, 'auto_gradable' => false]);

    $evaluation->questions()->attach($questionOne->id, ['order_index' => 0]);
    $evaluation->questions()->attach($questionTwo->id, ['order_index' => 1]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, CohortCourse::factory()->for($course)->open()->create()->id);

    return compact('admin', 'student', 'evaluation', 'questionOne', 'questionTwo');
}

it('hides the score in both the submit response and the review endpoint while grading is pending', function (): void {
    ['student' => $student, 'evaluation' => $evaluation, 'questionOne' => $questionOne, 'questionTwo' => $questionTwo] =
        setUpEvaluationWithTwoEssayQuestions();

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $questionOne->id, 'answer_text' => 'My first answer.'],
            ['question_id' => $questionTwo->id, 'answer_text' => 'My second answer.'],
        ],
    ]);

    $submit->assertOk();
    $submit->assertJsonPath('data.status', 'submitted');
    $submit->assertJsonPath('data.score_percent', null);

    $review = $this->actingAs($student)->getJson("/api/v1/attempts/{$attemptId}/review");

    $review->assertOk();
    $review->assertJsonPath('data.status', 'submitted');
    $review->assertJsonPath('data.summary.total_score', null);
    $review->assertJsonPath('data.summary.max_score', null);
    $review->assertJsonPath('data.summary.score_percent', null);
});

it('does not finalize the score after grading only some of the pending manual answers', function (): void {
    ['admin' => $admin, 'student' => $student, 'evaluation' => $evaluation, 'questionOne' => $questionOne, 'questionTwo' => $questionTwo] =
        setUpEvaluationWithTwoEssayQuestions();

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $questionOne->id, 'answer_text' => 'My first answer.'],
            ['question_id' => $questionTwo->id, 'answer_text' => 'My second answer.'],
        ],
    ]);

    $firstAnswerId = collect($submit->json('data.answers'))->firstWhere('question_id', $questionOne->id)['id'];

    // Grade only ONE of the two pending answers — the attempt must not finalize on this call.
    $partialGrade = $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [
            ['answer_id' => $firstAnswerId, 'is_correct' => true, 'points_awarded' => 10],
        ],
    ]);

    $partialGrade->assertOk();
    $partialGrade->assertJsonPath('data.status', 'submitted');
    $partialGrade->assertJsonPath('data.score_percent', null);

    expect(EvaluationAttempt::find($attemptId)->status)->toBe(EvaluationAttemptStatus::Submitted);
});

/**
 * The grading UI submits a points value and nothing else — `is_correct` is optional in
 * GradeEvaluationAttemptRequest and the forms never send it. Grading must still complete, which
 * it cannot if "has this been reviewed" is inferred from `is_correct` rather than `graded_at`.
 */
it('finalizes the score when grades are submitted without an explicit is_correct', function (): void {
    ['admin' => $admin, 'student' => $student, 'evaluation' => $evaluation, 'questionOne' => $questionOne, 'questionTwo' => $questionTwo] =
        setUpEvaluationWithTwoEssayQuestions();

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $questionOne->id, 'answer_text' => 'My first answer.'],
            ['question_id' => $questionTwo->id, 'answer_text' => 'My second answer.'],
        ],
    ]);

    $answers = collect($submit->json('data.answers'));

    $graded = $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [
            ['answer_id' => $answers->firstWhere('question_id', $questionOne->id)['id'], 'points_awarded' => 10],
            ['answer_id' => $answers->firstWhere('question_id', $questionTwo->id)['id'], 'points_awarded' => 4],
        ],
    ]);

    $graded->assertOk();
    $graded->assertJsonPath('data.status', 'graded');
    $graded->assertJsonPath('data.score_percent', '70.00');

    // Full marks reads as correct; partial credit is neither correct nor incorrect, and the
    // awarded points carry that meaning instead — so graded_at, not is_correct, is what proves
    // the partially-credited answer was actually reviewed.
    $gradedAnswers = collect($graded->json('data.answers'));
    expect($gradedAnswers->firstWhere('question_id', $questionOne->id)['is_correct'])->toBeTrue();
    expect($gradedAnswers->firstWhere('question_id', $questionTwo->id)['is_correct'])->toBeNull();

    $partiallyCredited = EvaluationAttemptAnswer::query()
        ->where('attempt_id', $attemptId)
        ->where('question_id', $questionTwo->id)
        ->sole();

    expect($partiallyCredited->graded_at)->not->toBeNull();
    expect($partiallyCredited->graded_by)->toBe($admin->id);
});

it('withholds the question breakdown from the student until every answer is graded', function (): void {
    ['admin' => $admin, 'student' => $student, 'evaluation' => $evaluation, 'questionOne' => $questionOne, 'questionTwo' => $questionTwo] =
        setUpEvaluationWithTwoEssayQuestions();

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $questionOne->id, 'answer_text' => 'My first answer.'],
            ['question_id' => $questionTwo->id, 'answer_text' => 'My second answer.'],
        ],
    ]);

    // Grade only one of the two — the student must still see nothing, not a partial breakdown.
    $firstAnswerId = collect($submit->json('data.answers'))->firstWhere('question_id', $questionOne->id)['id'];
    $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [['answer_id' => $firstAnswerId, 'points_awarded' => 10]],
    ]);

    $studentReview = $this->actingAs($student)->getJson("/api/v1/attempts/{$attemptId}/review");
    $studentReview->assertOk();
    $studentReview->assertJsonPath('data.status', 'submitted');
    $studentReview->assertJsonCount(0, 'data.questions');

    // The grader still needs the breakdown in order to finish grading it.
    $graderReview = $this->actingAs($admin)->getJson("/api/v1/attempts/{$attemptId}/review");
    $graderReview->assertOk();
    $graderReview->assertJsonCount(2, 'data.questions');

    // Once grading completes, the student gets the whole thing.
    $secondAnswerId = collect($submit->json('data.answers'))->firstWhere('question_id', $questionTwo->id)['id'];
    $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [['answer_id' => $secondAnswerId, 'points_awarded' => 8]],
    ])->assertJsonPath('data.status', 'graded');

    $finalReview = $this->actingAs($student)->getJson("/api/v1/attempts/{$attemptId}/review");
    $finalReview->assertJsonCount(2, 'data.questions');
    $finalReview->assertJsonPath('data.summary.total_score', 18);
});

it('finalizes the score once every manually-graded answer has been reviewed', function (): void {
    ['admin' => $admin, 'student' => $student, 'evaluation' => $evaluation, 'questionOne' => $questionOne, 'questionTwo' => $questionTwo] =
        setUpEvaluationWithTwoEssayQuestions();

    $start = $this->actingAs($student)->postJson("/api/v1/evaluations/{$evaluation->id}/attempts");
    $attemptId = $start->json('data.attempt.id');

    $submit = $this->actingAs($student)->postJson("/api/v1/attempts/{$attemptId}/submit", [
        'answers' => [
            ['question_id' => $questionOne->id, 'answer_text' => 'My first answer.'],
            ['question_id' => $questionTwo->id, 'answer_text' => 'My second answer.'],
        ],
    ]);

    $answers = collect($submit->json('data.answers'));
    $firstAnswerId = $answers->firstWhere('question_id', $questionOne->id)['id'];
    $secondAnswerId = $answers->firstWhere('question_id', $questionTwo->id)['id'];

    $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [['answer_id' => $firstAnswerId, 'is_correct' => true, 'points_awarded' => 10]],
    ])->assertJsonPath('data.status', 'submitted');

    $finalGrade = $this->actingAs($admin)->postJson("/api/v1/attempts/{$attemptId}/grade", [
        'answer_grades' => [['answer_id' => $secondAnswerId, 'is_correct' => true, 'points_awarded' => 5]],
    ]);

    $finalGrade->assertOk();
    $finalGrade->assertJsonPath('data.status', 'graded');
    $finalGrade->assertJsonPath('data.score_percent', '75.00');

    // PHP's json_encode drops the trailing .0 on whole floats, so these decode as ints.
    $review = $this->actingAs($student)->getJson("/api/v1/attempts/{$attemptId}/review");
    $review->assertJsonPath('data.summary.total_score', 15);
    $review->assertJsonPath('data.summary.max_score', 20);
    $review->assertJsonPath('data.summary.score_percent', '75.00');
});
