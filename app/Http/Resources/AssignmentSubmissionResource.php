<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AssignmentSubmissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_id' => $this->assignment_id,
            'student' => new UserResource($this->whenLoaded('student')),
            'attempt_number' => $this->attempt_number,
            'file_url' => app(MediaStorageService::class)->url($this->file_url),
            'text_content' => $this->text_content,
            'submitted_at' => $this->submitted_at->toIso8601String(),
            'is_late' => $this->is_late,
            'late_penalty_percent' => $this->late_penalty_percent,
            'status' => $this->status->value,
            'raw_score' => $this->raw_score,
            'final_score' => $this->final_score,
            'feedback' => $this->feedback,
            'graded_at' => $this->graded_at?->toIso8601String(),
            'rubric_scores' => AssignmentSubmissionRubricScoreResource::collection($this->whenLoaded('rubricScores')),
        ];
    }
}
