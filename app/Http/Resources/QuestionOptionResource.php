<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Includes is_correct — only ever returned to admins/instructors managing the question bank.
 * Students see questions through EvaluationAttemptController, which builds its own sanitized
 * shape with no answer key.
 */
final class QuestionOptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'option_text' => $this->option_text,
            'is_correct' => $this->is_correct,
            'order_index' => $this->order_index,
        ];
    }
}
