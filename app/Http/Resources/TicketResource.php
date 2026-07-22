<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TicketResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student' => new UserResource($this->whenLoaded('student')),
            'course' => $this->whenLoaded('course', fn () => $this->course ? ['id' => $this->course->id, 'title' => $this->course->title] : null),
            'assigned_to' => new UserResource($this->whenLoaded('assignedTo')),
            'subject' => $this->subject,
            'status' => $this->status->value,
            'created_at' => $this->created_at->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'messages' => TicketMessageResource::collection($this->whenLoaded('messages')),
        ];
    }
}
