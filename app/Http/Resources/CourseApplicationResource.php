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
            'section' => $this->whenLoaded('section', fn () => $this->section
                ? ['id' => $this->section->id, 'name' => $this->section->name, 'status' => $this->section->status->value]
                : null),
            'answers' => $this->answers,
            'portfolio_url' => $this->portfolio_url,
            'alternative_proof_text' => $this->alternative_proof_text,
            'rejection_reason' => $this->rejection_reason,
            'dismissed_at' => $this->dismissed_at?->toIso8601String(),
            'recommended_courses' => CourseResource::collection(
                // List endpoints batch-load this via CourseApplication::loadRecommendedCourses();
                // single-resource responses fall back to the per-model lookup.
                $this->resource->relationLoaded('recommendedCourses')
                    ? $this->resource->getRelation('recommendedCourses')
                    : $this->resource->recommendedCourses(),
            ),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer
                ? ['id' => $this->reviewer->id, 'name' => $this->reviewer->name, 'role' => $this->reviewer->role->value]
                : null),
            'applied_at' => $this->created_at->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
        ];
    }
}
