<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * This resource also backs the public (unauthenticated) reviews endpoint, so the `student`/
 * `reviewer` fields are deliberately a minimal id+name shape rather than the full `UserResource`
 * — no email/phone/etc. leaking to guests.
 *
 * @property CourseReview $resource
 */
final class CourseReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'review_text' => $this->review_text,
            'status' => $this->status->value,
            'admin_notes' => $this->admin_notes,
            'is_featured' => $this->is_featured,
            'student' => $this->whenLoaded('student', fn () => ['id' => $this->student->id, 'name' => $this->student->name]),
            'course' => new CourseResource($this->whenLoaded('course')),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? ['id' => $this->reviewer->id, 'name' => $this->reviewer->name] : null),
            'created_at' => $this->created_at->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
        ];
    }
}
