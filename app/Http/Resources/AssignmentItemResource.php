<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\ModuleItemType;
use App\Enums\UserRole;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\ModuleItem;
use App\Services\Progress\ProgressEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The assignment summary shown inline in a module's unified item list (alongside resources
 * and evaluations) — not the full `AssignmentResource` (no rubrics here, this is a listing
 * shape, not the assignment detail/edit shape).
 *
 * @property Assignment $resource
 */
final class AssignmentItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $moduleItem = ModuleItem::query()
            ->where('item_type', ModuleItemType::Assignment)
            ->where('item_id', $this->id)
            ->first();

        $user = $request->user();
        $isComplete = null;
        $mySubmission = null;

        if ($user && $user->role === UserRole::Student) {
            $isComplete = $moduleItem && app(ProgressEngine::class)->isModuleItemComplete($user, $moduleItem);

            $submission = AssignmentSubmission::query()
                ->where('assignment_id', $this->id)
                ->where('student_id', $user->id)
                ->orderByDesc('attempt_number')
                ->first();

            if ($submission) {
                $mySubmission = [
                    'status' => $submission->status->value,
                    'is_late' => $submission->is_late,
                    'final_score' => $submission->final_score,
                    'submitted_at' => $submission->submitted_at->toIso8601String(),
                ];
            }
        }

        return [
            'item_type' => 'assignment',
            'id' => $this->id,
            'title' => $this->title,
            'due_at' => $this->due_at?->toIso8601String(),
            'submission_type' => $this->submission_type->value,
            'max_score' => $this->max_score,
            'allow_late' => $this->allow_late,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'is_required' => $moduleItem?->is_required ?? true,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'order_index' => $moduleItem?->order_index ?? 0,
            'is_complete' => $isComplete,
            'my_submission' => $mySubmission,
        ];
    }
}
