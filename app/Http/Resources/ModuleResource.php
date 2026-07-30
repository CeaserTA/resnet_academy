<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\ModuleProgressStatus;
use App\Models\Module;
use App\Models\ModuleProgress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Module $resource
 */
final class ModuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $studentStatus = null;
        $user = $request->user();

        if ($user && $user->role->value === 'student') {
            $progress = ModuleProgress::where('student_id', $user->id)->where('module_id', $this->id)->first();
            $studentStatus = $progress?->status->value ?? ModuleProgressStatus::Locked->value;
        }

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'description' => $this->description,
            'order_index' => $this->order_index,
            'scheduled_start_at' => $this->scheduled_start_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'group_ids' => $this->whenLoaded('groups', fn () => $this->groups->pluck('id')),
            'items' => $this->resource->relationLoaded('resources') ? $this->itemsPayload($request) : [],
            'status' => $studentStatus,
        ];
    }

    /**
     * A module's `items` mixes three unrelated tables (resources/assignments/evaluations —
     * `ModuleItem` deliberately has no morphTo(), see that model's docblock), so they're
     * fetched via three separate relations and merged here into one list ordered the same way
     * `module_items.order_index` orders them for unlock/rollup logic in the Progress Engine.
     *
     * @return array<int, array<string, mixed>>
     */
    private function itemsPayload(Request $request): array
    {
        $items = collect();

        foreach ($this->resources as $resource) {
            $items->push((new ResourceItemResource($resource))->toArray($request));
        }

        foreach ($this->assignments as $assignment) {
            $items->push((new AssignmentItemResource($assignment))->toArray($request));
        }

        foreach ($this->evaluations as $evaluation) {
            $items->push((new EvaluationItemResource($evaluation))->toArray($request));
        }

        return $items->sortBy('order_index')->values()->all();
    }
}
