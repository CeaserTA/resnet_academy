<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\CourseApplicationStatus;
use App\Enums\EnrolmentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\CourseSection
 */
final class CourseSectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'application_deadline' => $this->application_deadline?->toDateString(),
            'capacity' => $this->capacity,
            'seats_taken' => $this->seats_taken,
            'status' => $this->status->value,
            'primary_instructor_id' => $this->primary_instructor_id,
            'primary_instructor' => $this->whenLoaded('primaryInstructor', fn () => new UserResource($this->primaryInstructor)),
            'enrolled_count' => $this->when(
                $this->relationLoaded('enrolments'),
                fn () => $this->enrolments->where('status', EnrolmentStatus::Confirmed)->count()
            ),
            'waitlisted_count' => $this->when(
                $this->relationLoaded('enrolments'),
                fn () => $this->enrolments->where('status', EnrolmentStatus::Waitlisted)->count()
            ),
            'applications_pending_count' => $this->when(
                $this->relationLoaded('applications'),
                fn () => $this->applications->where('status', CourseApplicationStatus::Pending)->count()
            ),
            'is_full' => $this->isFull(),
            'is_accepting_applications' => $this->isAcceptingApplications(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
