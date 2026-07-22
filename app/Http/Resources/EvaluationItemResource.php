<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\EvaluationAttemptStatus;
use App\Enums\ModuleItemType;
use App\Enums\UserRole;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\ModuleItem;
use App\Services\Progress\ProgressEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The evaluation summary shown inline in a module's unified item list — not the full
 * `EvaluationResource` (no questions/answer key here, this is a listing shape only).
 *
 * @property Evaluation $resource
 */
final class EvaluationItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $moduleItem = ModuleItem::query()
            ->where('item_type', ModuleItemType::Evaluation)
            ->where('item_id', $this->id)
            ->first();

        $user = $request->user();
        $isComplete = null;
        $attemptsUsed = null;
        $myBestAttempt = null;

        if ($user && $user->role === UserRole::Student) {
            $isComplete = $moduleItem && app(ProgressEngine::class)->isModuleItemComplete($user, $moduleItem);

            $attempts = EvaluationAttempt::query()
                ->where('evaluation_id', $this->id)
                ->where('student_id', $user->id)
                ->get();

            $attemptsUsed = $attempts->count();

            $best = $attempts->where('status', EvaluationAttemptStatus::Graded)->sortByDesc('score_percent')->first();

            if ($best) {
                $myBestAttempt = [
                    'score_percent' => $best->score_percent,
                    'passed' => $best->passed,
                ];
            }
        }

        return [
            'item_type' => 'evaluation',
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'pass_score' => $this->pass_score,
            'max_attempts' => $this->max_attempts,
            'time_limit_minutes' => $this->time_limit_minutes,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'is_required' => $moduleItem?->is_required ?? true,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'order_index' => $moduleItem?->order_index ?? 0,
            'is_complete' => $isComplete,
            'attempts_used' => $attemptsUsed,
            'my_best_attempt' => $myBestAttempt,
        ];
    }
}
