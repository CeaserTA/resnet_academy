<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\ModuleItemType;
use App\Models\Assignment;
use App\Models\AssignmentRubric;
use App\Models\Module;
use App\Models\ModuleItem;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Mirrors ResourceManager's pattern (app/Services/Content/ResourceManager.php): an assignment
 * and its module_items slot are always created/removed together, and rubric rows (business
 * rule "Grading rubrics") are managed as a single replace-all set rather than incremental
 * add/remove — simpler to reason about than diffing rubric edits.
 */
final class AssignmentManager
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Module $module, array $data): Assignment
    {
        return DB::transaction(function () use ($module, $data): Assignment {
            $assignment = Assignment::create([
                ...Arr::only($data, [
                    'title', 'instructions', 'submission_type', 'due_at', 'allow_late',
                    'late_penalty_policy_id', 'max_score', 'plagiarism_check_enabled',
                ]),
                'module_id' => $module->id,
            ]);
            $assignment->refresh();

            $this->syncRubrics($assignment, $data['rubrics'] ?? null);

            ModuleItem::create([
                'module_id' => $module->id,
                'item_type' => ModuleItemType::Assignment,
                'item_id' => $assignment->id,
                'order_index' => $data['order_index'] ?? ((int) $module->items()->max('order_index')) + 1,
                'is_required' => $data['is_required'] ?? true,
            ]);

            return $assignment;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Assignment $assignment, array $data): Assignment
    {
        return DB::transaction(function () use ($assignment, $data): Assignment {
            $assignment->update(Arr::only($data, [
                'title', 'instructions', 'submission_type', 'due_at', 'allow_late',
                'late_penalty_policy_id', 'max_score', 'plagiarism_check_enabled',
            ]));

            if (array_key_exists('rubrics', $data)) {
                $this->syncRubrics($assignment, $data['rubrics']);
            }

            $moduleItem = ModuleItem::query()
                ->where('item_type', ModuleItemType::Assignment)
                ->where('item_id', $assignment->id)
                ->first();

            $moduleItemFields = Arr::only($data, ['is_required', 'order_index']);

            if ($moduleItem && $moduleItemFields !== []) {
                $moduleItem->update($moduleItemFields);
            }

            return $assignment->fresh();
        });
    }

    public function delete(Assignment $assignment): void
    {
        DB::transaction(function () use ($assignment): void {
            ModuleItem::query()
                ->where('item_type', ModuleItemType::Assignment)
                ->where('item_id', $assignment->id)
                ->delete();

            $assignment->delete();
        });
    }

    /**
     * @param  array<int, array{criterion: string, max_points: float|int}>|null  $rubrics
     */
    private function syncRubrics(Assignment $assignment, ?array $rubrics): void
    {
        if ($rubrics === null) {
            return;
        }

        $assignment->rubrics()->delete();

        foreach ($rubrics as $index => $rubric) {
            AssignmentRubric::create([
                'assignment_id' => $assignment->id,
                'criterion' => $rubric['criterion'],
                'max_points' => $rubric['max_points'],
                'order_index' => $index,
            ]);
        }
    }
}
