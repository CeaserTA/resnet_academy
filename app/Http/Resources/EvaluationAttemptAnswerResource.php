<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class EvaluationAttemptAnswerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'selected_option_ids' => $this->selected_option_ids,
            'answer_text' => $this->answer_text,
            'is_correct' => $this->is_correct,
            'points_awarded' => $this->points_awarded,
        ];
    }
}
