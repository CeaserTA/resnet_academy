<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AssignmentSubmissionRubricScoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'rubric_id' => $this->rubric_id,
            'score' => $this->score,
            'comment' => $this->comment,
        ];
    }
}
