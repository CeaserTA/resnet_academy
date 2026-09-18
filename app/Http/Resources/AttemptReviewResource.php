<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\EvaluationAttemptStatus;
use App\Models\EvaluationAttemptAnswer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Post-attempt breakdown WITH the answer key — the counterpart to AttemptQuestionResource
 * (which strips is_correct mid-attempt). Only ever returned by
 * EvaluationAttemptController::review, which rejects anything but completed attempts, so
 * the key can never leak into a live, answerable attempt.
 */
final class AttemptReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Collection<int, EvaluationAttemptAnswer> $answers */
        $answers = $this->answers;

        // Only a fully-graded attempt (status Graded — EvaluationAttemptService::finalizeScore()
        // only sets this once every manually-graded answer has been reviewed) has a real score.
        // While any manually-graded answer is still pending (graded_at null, status Submitted),
        // summing points_awarded ?? 0 would silently treat unreviewed answers as worth zero and
        // expose a provisional score no student should see.
        $isFullyGraded = $this->status === EvaluationAttemptStatus::Graded;
        $maxScore = $isFullyGraded ? (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) $answer->question->points) : null;
        $totalScore = $isFullyGraded ? (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) ($answer->points_awarded ?? 0)) : null;

        // Students get no partial review: until every answer is graded they see the summary
        // shell only, never a per-question breakdown. Withholding it here rather than in the UI
        // keeps the answer key and the already-scored questions out of the response entirely.
        // Graders still need the breakdown while an attempt is mid-grading.
        $canSeeBreakdown = $isFullyGraded || $request->user()?->can('grade', $this->evaluation);

        return [
            'attempt_id' => $this->id,
            'evaluation_id' => $this->evaluation_id,
            'attempt_number' => $this->attempt_number,
            'status' => $this->status->value,
            'summary' => [
                'total_score' => $totalScore !== null ? round($totalScore, 2) : null,
                'max_score' => $maxScore !== null ? round($maxScore, 2) : null,
                'score_percent' => $this->score_percent,
                'passed' => $this->passed,
                'started_at' => $this->started_at->toIso8601String(),
                'submitted_at' => $this->submitted_at?->toIso8601String(),
                'time_taken_seconds' => $this->submitted_at !== null
                    ? $this->submitted_at->getTimestamp() - $this->started_at->getTimestamp()
                    : null,
            ],
            'questions' => ! $canSeeBreakdown ? [] : $answers->map(fn (EvaluationAttemptAnswer $answer) => [
                'question_id' => $answer->question_id,
                'type' => $answer->question->type->value,
                'question_text' => $answer->question->question_text,
                'points' => $answer->question->points,
                'points_awarded' => $answer->points_awarded,
                'is_correct' => $answer->is_correct,
                'auto_gradable' => (bool) $answer->question->auto_gradable,
                'graded_at' => $answer->graded_at?->toIso8601String(),
                'selected_option_ids' => $answer->selected_option_ids ?? [],
                'answer_text' => $answer->answer_text,
                'options' => $answer->question->relationLoaded('options')
                    ? $answer->question->options->map(fn ($option) => [
                        'id' => $option->id,
                        'option_text' => $option->option_text,
                        'is_correct' => (bool) $option->is_correct,
                        'selected' => in_array($option->id, $answer->selected_option_ids ?? [], true),
                    ])->values()
                    : [],
            ])->values(),
        ];
    }
}
