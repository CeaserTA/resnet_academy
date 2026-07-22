<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\ModuleItemType;
use App\Models\Evaluation;
use App\Models\Module;
use App\Models\ModuleItem;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Same create/update/delete-together pattern as ResourceManager and AssignmentManager: an
 * evaluation and its module_items slot are managed as one unit.
 */
final class EvaluationManager
{
    private const FIELDS = [
        'title', 'description', 'pass_score', 'max_attempts', 'time_limit_minutes',
        'randomize_questions', 'questions_per_attempt', 'available_from', 'available_until',
    ];

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Module $module, array $data): Evaluation
    {
        return DB::transaction(function () use ($module, $data): Evaluation {
            $evaluation = Evaluation::create([
                ...Arr::only($data, self::FIELDS),
                'module_id' => $module->id,
            ]);
            $evaluation->refresh();

            $this->syncQuestions($evaluation, $data['question_ids'] ?? null);

            ModuleItem::create([
                'module_id' => $module->id,
                'item_type' => ModuleItemType::Evaluation,
                'item_id' => $evaluation->id,
                'order_index' => $data['order_index'] ?? ((int) $module->items()->max('order_index')) + 1,
                'is_required' => $data['is_required'] ?? true,
            ]);

            return $evaluation;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Evaluation $evaluation, array $data): Evaluation
    {
        return DB::transaction(function () use ($evaluation, $data): Evaluation {
            $evaluation->update(Arr::only($data, self::FIELDS));

            if (array_key_exists('question_ids', $data)) {
                $this->syncQuestions($evaluation, $data['question_ids']);
            }

            $moduleItem = ModuleItem::query()
                ->where('item_type', ModuleItemType::Evaluation)
                ->where('item_id', $evaluation->id)
                ->first();

            $moduleItemFields = Arr::only($data, ['is_required', 'order_index']);

            if ($moduleItem && $moduleItemFields !== []) {
                $moduleItem->update($moduleItemFields);
            }

            return $evaluation->fresh();
        });
    }

    public function delete(Evaluation $evaluation): void
    {
        DB::transaction(function () use ($evaluation): void {
            ModuleItem::query()
                ->where('item_type', ModuleItemType::Evaluation)
                ->where('item_id', $evaluation->id)
                ->delete();

            $evaluation->delete();
        });
    }

    /**
     * @param  array<int, int>|null  $questionIds
     */
    private function syncQuestions(Evaluation $evaluation, ?array $questionIds): void
    {
        if ($questionIds === null) {
            return;
        }

        $evaluation->questions()->sync(
            collect($questionIds)->mapWithKeys(fn (int $id, int $index) => [$id => ['order_index' => $index]])->all(),
        );
    }
}
