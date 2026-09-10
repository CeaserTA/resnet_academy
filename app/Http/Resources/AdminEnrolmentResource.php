<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin roster row — richer than the student-facing EnrolmentResource: includes the student's
 * identity, cohort name, and their progress percentage (attached by the admin controller).
 */
final class AdminEnrolmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'email' => $this->student->email,
            ],
            'course' => [
                'id' => $this->course->id,
                'title' => $this->course->title,
                'enrolment_policy' => $this->course->enrolment_policy->value,
            ],
            'cohort_course' => $this->whenLoaded(
                'cohortCourse',
                fn () => $this->cohortCourse !== null
                    ? [
                        'id' => $this->cohortCourse->id,
                        'cohort_id' => $this->cohortCourse->cohort_id,
                        'cohort_name' => $this->cohortCourse->cohort?->name,
                    ]
                    : null,
            ),
            'status' => $this->status->value,
            'source' => $this->source->value,
            'progress_percent' => (float) ($this->resource->getAttribute('progress_percent') ?? 0),
            'applied_at' => $this->applied_at->toIso8601String(),
            'transfer_requested_at' => $this->transfer_requested_at?->toIso8601String(),
            'withdrawal_note' => $this->withdrawal_note,
            'order' => new OrderResource($this->whenLoaded('order')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
