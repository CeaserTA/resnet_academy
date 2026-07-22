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
            'applied_at' => $this->applied_at->toIso8601String(),
            'confirmation_email_due_at' => $this->confirmation_email_due_at->toIso8601String(),
            'confirmation_email_sent_at' => $this->confirmation_email_sent_at?->toIso8601String(),
            'order' => new OrderResource($this->whenLoaded('order')),
        ];
    }
}
