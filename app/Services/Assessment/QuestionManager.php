<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\QuestionType;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use Illuminate\Support\Facades\DB;

/**
 * auto_gradable is derived from the question type, never trusted from client input
 * (schema.sql comment: "FALSE for short_answer/essay needing manual grading").
 */
final class QuestionManager
{
    private const AUTO_GRADABLE_TYPES = [QuestionType::McqSingle, QuestionType::McqMulti, QuestionType::TrueFalse];

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(QuestionBank $bank, array $data): Question
    {
        return DB::transaction(function () use ($bank, $data): Question {
            $type = QuestionType::from($data['type']);

            $question = Question::create([
                'question_bank_id' => $bank->id,
                'type' => $type,
                'question_text' => $data['question_text'],
                'points' => $data['points'] ?? 1,
                'auto_gradable' => in_array($type, self::AUTO_GRADABLE_TYPES, true),
            ]);

            foreach ($data['options'] ?? [] as $index => $option) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'option_text' => $option['option_text'],
                    'is_correct' => $option['is_correct'] ?? false,
                    'order_index' => $index,
                ]);
            }

            return $question->fresh();
        });
    }

    public function delete(Question $question): void
    {
        $question->delete();
    }
}
