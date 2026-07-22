<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class EvaluationAttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'evaluation_id' => $this->evaluation_id,
            'student' => new UserResource($this->whenLoaded('student')),
            'attempt_number' => $this->attempt_number,
            'started_at' => $this->started_at->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'score_percent' => $this->score_percent,
            'passed' => $this->passed,
            'status' => $this->status->value,
            'answers' => EvaluationAttemptAnswerResource::collection($this->whenLoaded('answers')),
        ];
    }
}
