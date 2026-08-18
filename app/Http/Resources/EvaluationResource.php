<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModuleItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class EvaluationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $moduleItem = ModuleItem::query()
            ->where('item_type', 'evaluation')
            ->where('item_id', $this->id)
            ->first();

        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'course_id' => $this->module?->course_id,
            'title' => $this->title,
            'description' => $this->description,
            'instructions' => $this->instructions,
            'pass_score' => $this->pass_score,
            'max_attempts' => $this->max_attempts,
            'time_limit_minutes' => $this->time_limit_minutes,
            'randomize_questions' => $this->randomize_questions,
            'questions_per_attempt' => $this->questions_per_attempt,
            'available_from' => $this->available_from?->toIso8601String(),
            'available_until' => $this->available_until?->toIso8601String(),
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'is_required' => $moduleItem?->is_required ?? true,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'order_index' => $moduleItem?->order_index ?? 0,
            'question_count' => $this->whenCounted('questions'),
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
        ];
    }
}
