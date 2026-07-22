<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'level' => $this->level->value,
            'thumbnail_url' => $this->thumbnail_url,
            'prerequisites_text' => $this->prerequisites_text,
            'price' => $this->price,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'current_version' => $this->current_version,
            'confirmation_delay_hours' => $this->confirmation_delay_hours,
            'schedule_start_date' => $this->schedule_start_date?->toDateString(),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'instructors' => UserResource::collection($this->whenLoaded('instructors')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
