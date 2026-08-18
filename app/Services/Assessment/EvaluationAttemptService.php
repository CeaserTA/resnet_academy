<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\EvaluationAttemptStatus;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\EvaluationAttemptAnswer;
use App\Models\Question;
use App\Models\User;
use App\Services\Analytics\EngagementTracker;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * FR-12: attempt limits, time limits, question randomization/subsetting, auto-grading for
 * objective types, manual-grading queue for short_answer/essay. "Retakes are allowed rather
 * than lowering the bar" (PRD) — module completion checks for *any* passed attempt
 * (ProgressEngine::isModuleItemComplete), so a later failed retake never un-completes it.
 */
final class EvaluationAttemptService
{
    public function __construct(
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EngagementTracker $engagementTracker,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function start(User $student, Evaluation $evaluation): EvaluationAttempt
    {
        $now = now();

        abort_if(
            $evaluation->available_from !== null && $now->lessThan($evaluation->available_from),
            403,
            'This evaluation is not open yet.',
        );
        abort_if(
            $evaluation->available_until !== null && $now->greaterThan($evaluation->available_until),
            403,
            'This evaluation is no longer available.',
        );

        $existing = EvaluationAttempt::query()
            ->where('evaluation_id', $evaluation->id)
            ->where('student_id', $student->id)
            ->where('status', EvaluationAttemptStatus::InProgress)
            ->first();

        if ($existing) {
            return $existing;
        }

        $attemptCount = EvaluationAttempt::query()
            ->where('evaluation_id', $evaluation->id)
            ->where('student_id', $student->id)
            ->count();

        abort_if(
            $evaluation->max_attempts !== null && $attemptCount >= $evaluation->max_attempts,
            403,
            'You have used all the attempts allowed for this evaluation.',
        );

        return EvaluationAttempt::create([
            'evaluation_id' => $evaluation->id,
            'student_id' => $student->id,
            'attempt_number' => $attemptCount + 1,
            'started_at' => $now,
            'status' => EvaluationAttemptStatus::InProgress,
        ]);
    }

    /**
     * @return Collection<int, Question>
     */
    public function questionsFor(EvaluationAttempt $attempt): Collection
    {
        $evaluation = $attempt->evaluation;
        $questions = $evaluation->questions()->with('options')->get();

        if ($evaluation->randomize_questions) {
            $questions = $questions->shuffle();
        }

        if ($evaluation->questions_per_attempt !== null) {
            $questions = $questions->take($evaluation->questions_per_attempt);
        }

        return $questions->values();
    }

    /**
     * @param  array<int, array{question_id: int, selected_option_ids?: array<int, int>, answer_text?: string}>  $answers
     */
    public function submit(EvaluationAttempt $attempt, array $answers): EvaluationAttempt
    {
        // Attempt results are strictly immutable once completed: a re-submit must never
        // append or overwrite answers (it would also double-count in the gradebook).
        abort_if(
            $attempt->isCompleted(),
            422,
            'This attempt has already been submitted and can no longer be modified.',
        );

        return DB::transaction(function () use ($attempt, $answers): EvaluationAttempt {
            $evaluation = $attempt->evaluation;

            if ($evaluation->time_limit_minutes !== null) {
                $deadline = $attempt->started_at->clone()->addMinutes($evaluation->time_limit_minutes);
                abort_if(now()->greaterThan($deadline), 422, 'The time limit for this attempt has passed.');
            }

            $needsManualGrading = false;

            foreach ($answers as $answerData) {
                $question = Question::findOrFail($answerData['question_id']);

                $isCorrect = null;
                $pointsAwarded = null;

                if ($question->auto_gradable) {
                    $isCorrect = $this->isObjectiveAnswerCorrect($question, $answerData['selected_option_ids'] ?? []);
                    $pointsAwarded = $isCorrect ? (float) $question->points : 0.0;
                } else {
                    $needsManualGrading = true;
                }

                EvaluationAttemptAnswer::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'selected_option_ids' => $answerData['selected_option_ids'] ?? null,
                    'answer_text' => $answerData['answer_text'] ?? null,
                    'is_correct' => $isCorrect,
                    'points_awarded' => $pointsAwarded,
                ]);
            }

            $attempt->update(['submitted_at' => now()]);

            $this->engagementTracker->track($attempt->student, $evaluation->module->course, 'quiz_attempted', ['evaluation_id' => $evaluation->id, 'attempt_id' => $attempt->id]);

            if ($needsManualGrading) {
                $attempt->update(['status' => EvaluationAttemptStatus::Submitted]);

                return $attempt->fresh();
            }

            return $this->finalizeScore($attempt);
        });
    }

    /**
     * @param  array<int, array{answer_id: int, is_correct?: bool, points_awarded: float}>  $answerGrades
     */
    public function gradeManualAnswers(User $grader, EvaluationAttempt $attempt, array $answerGrades): EvaluationAttempt
    {
        return DB::transaction(function () use ($grader, $attempt, $answerGrades): EvaluationAttempt {
            foreach ($answerGrades as $grade) {
                EvaluationAttemptAnswer::query()
                    ->where('id', $grade['answer_id'])
                    ->where('attempt_id', $attempt->id)
                    ->update([
                        'is_correct' => $grade['is_correct'] ?? null,
                        'points_awarded' => $grade['points_awarded'],
                        'graded_by' => $grader->id,
                        'graded_at' => now(),
                    ]);
            }

            $finalized = $this->finalizeScore($attempt);

            $this->auditLogger->log(
                action: 'grade.changed',
                entityType: 'evaluation_attempt',
                entityId: $attempt->id,
                actorId: $grader->id,
                meta: ['score_percent' => $finalized->score_percent, 'passed' => $finalized->passed],
            );

            return $finalized;
        });
    }

    private function finalizeScore(EvaluationAttempt $attempt): EvaluationAttempt
    {
        $evaluation = $attempt->evaluation;
        $answers = $attempt->answers()->with('question')->get();

        $totalPoints = (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) $answer->question->points);
        $earnedPoints = (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) ($answer->points_awarded ?? 0));
        $scorePercent = $totalPoints > 0 ? round($earnedPoints / $totalPoints * 100, 2) : 0.0;
        $passed = $scorePercent >= (float) $evaluation->pass_score;

        $attempt->update([
            'score_percent' => $scorePercent,
            'passed' => $passed,
            'status' => EvaluationAttemptStatus::Graded,
        ]);

        $this->notificationDispatcher->notifyGradePosted($attempt->student, $evaluation->title, 'evaluation_attempt', $attempt->id);

        if ($passed) {
            $this->progressEngine->rollupModuleCompletion($attempt->student, $evaluation->module);
        }

        return $attempt->fresh();
    }

    /**
     * @param  array<int, int>  $selectedOptionIds
     */
    private function isObjectiveAnswerCorrect(Question $question, array $selectedOptionIds): bool
    {
        $correctOptionIds = $question->options()->where('is_correct', true)->pluck('id')->sort()->values()->all();
        $selected = collect($selectedOptionIds)->sort()->values()->all();

        return $correctOptionIds === $selected;
    }
}
