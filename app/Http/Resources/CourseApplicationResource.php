<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property CourseApplication $resource
 */
final class CourseApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'student' => new UserResource($this->whenLoaded('student')),
            'course' => new CourseResource($this->whenLoaded('course')),
            'answers' => $this->answers,
            'portfolio_url' => $this->portfolio_url,
            'alternative_proof_text' => $this->alternative_proof_text,
            'recommended_courses' => CourseResource::collection($this->resource->recommendedCourses()),
            'applied_at' => $this->created_at->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
        ];
    }
}
