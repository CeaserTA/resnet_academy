<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModuleItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $moduleItem = ModuleItem::query()
            ->where('item_type', 'assignment')
            ->where('item_id', $this->id)
            ->first();

        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'title' => $this->title,
            'instructions' => $this->instructions,
            'submission_type' => $this->submission_type->value,
            'due_at' => $this->due_at?->toIso8601String(),
            'allow_late' => $this->allow_late,
            'late_penalty_policy_id' => $this->late_penalty_policy_id,
            'max_score' => $this->max_score,
            'plagiarism_check_enabled' => $this->plagiarism_check_enabled,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'is_required' => $moduleItem?->is_required ?? true,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'order_index' => $moduleItem?->order_index ?? 0,
            'rubrics' => AssignmentRubricResource::collection($this->whenLoaded('rubrics')),
        ];
    }
}
