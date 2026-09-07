<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class EnrolmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'source' => $this->source->value,
            'course' => new CourseResource($this->whenLoaded('course')),
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
            'applied_at' => $this->applied_at->toIso8601String(),
            'confirmation_email_due_at' => $this->confirmation_email_due_at->toIso8601String(),
            'confirmation_email_sent_at' => $this->confirmation_email_sent_at?->toIso8601String(),
            'transfer_requested_at' => $this->transfer_requested_at?->toIso8601String(),
            'transferred_to_id' => $this->transferred_to_id,
            'withdrawal_note' => $this->withdrawal_note,
            'order' => new OrderResource($this->whenLoaded('order')),
        ];
    }
}
