<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\CourseApplicationStatus;
use App\Enums\EnrolmentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\CohortCourse
 */
final class CohortCourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        [$price, $currency] = $this->resolvedPrice();

        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'cohort_id' => $this->cohort_id,
            'cohort_name' => $this->whenLoaded('cohort', fn () => $this->cohort->name),
            'start_date' => $this->whenLoaded('cohort', fn () => $this->cohort->start_date?->toDateString()),
            'end_date' => $this->whenLoaded('cohort', fn () => $this->cohort->end_date?->toDateString()),
            'application_deadline' => $this->whenLoaded('cohort', fn () => $this->cohort->application_deadline?->toDateString()),
            'capacity' => $this->capacity,
            'seats_taken' => $this->seats_taken,
            'enrolled_count' => $this->seats_taken,
            'seats_available' => $this->seats_available,
            'status' => $this->status->value,
            'price' => $price,
            'currency' => $currency,
            'price_override' => $this->price_override,
            'currency_override' => $this->currency_override,
            'primary_instructor_id' => $this->primary_instructor_id,
            'primary_instructor' => $this->whenLoaded('primaryInstructor', fn () => new UserResource($this->primaryInstructor)),
            'course' => $this->whenLoaded('course', fn () => new CourseResource($this->course)),
            'cohort' => $this->whenLoaded('cohort', fn () => new CohortResource($this->cohort)),
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
