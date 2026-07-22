<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The question shape a student sees while taking an evaluation — no `is_correct` on any
 * option, unlike QuestionOptionResource (which is only ever returned to the question bank's
 * managing instructors/admins). Never leak the answer key to a student mid-attempt.
 */
final class AttemptQuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'question_text' => $this->question_text,
            'points' => $this->points,
            'options' => $this->options->map(fn ($option) => [
                'id' => $option->id,
                'option_text' => $option->option_text,
            ]),
        ];
    }
}
