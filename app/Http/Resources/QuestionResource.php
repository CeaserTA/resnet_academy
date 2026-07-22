<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class QuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_bank_id' => $this->question_bank_id,
            'type' => $this->type->value,
            'question_text' => $this->question_text,
            'points' => $this->points,
            'auto_gradable' => $this->auto_gradable,
            'options' => QuestionOptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
