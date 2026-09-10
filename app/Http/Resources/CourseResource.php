<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isPrivileged = $user !== null && in_array($user->role->value, ['admin', 'instructor'], true);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'level' => $this->level->value,
            'enrolment_policy' => $this->enrolment_policy->value,
            'advisory_require_attestation' => $this->advisory_require_attestation,
            // Only admins/instructors (who can author these questions) ever see which answer is
            // correct — a student applying to the course must never learn it from the payload.
            'application_questions' => $isPrivileged
                ? $this->application_questions
                : collect($this->application_questions ?? [])
                    ->map(fn (array $question): array => ['text' => $question['text']])
                    ->all(),
            'application_pass_threshold' => $this->application_pass_threshold,
            'application_allow_alternative_proof' => $this->application_allow_alternative_proof,
            'application_require_portfolio_url' => $this->application_require_portfolio_url,
            'thumbnail_url' => app(MediaStorageService::class)->url($this->thumbnail_url),
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
