<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\EvaluationAttemptAnswer;
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
        /** @var \Illuminate\Database\Eloquent\Collection<int, EvaluationAttemptAnswer> $answers */
        $answers = $this->answers;

        $maxScore = (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) $answer->question->points);
        $totalScore = (float) $answers->sum(fn (EvaluationAttemptAnswer $answer) => (float) ($answer->points_awarded ?? 0));

        return [
            'attempt_id' => $this->id,
            'evaluation_id' => $this->evaluation_id,
            'attempt_number' => $this->attempt_number,
            'status' => $this->status->value,
            'summary' => [
                'total_score' => round($totalScore, 2),
                'max_score' => round($maxScore, 2),
                'score_percent' => $this->score_percent,
                'passed' => $this->passed,
                'started_at' => $this->started_at->toIso8601String(),
                'submitted_at' => $this->submitted_at?->toIso8601String(),
                'time_taken_seconds' => $this->submitted_at !== null
                    ? $this->submitted_at->getTimestamp() - $this->started_at->getTimestamp()
                    : null,
            ],
            'questions' => $answers->map(fn (EvaluationAttemptAnswer $answer) => [
                'question_id' => $answer->question_id,
                'type' => $answer->question->type->value,
                'question_text' => $answer->question->question_text,
                'points' => $answer->question->points,
                'points_awarded' => $answer->points_awarded,
                'is_correct' => $answer->is_correct,
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
