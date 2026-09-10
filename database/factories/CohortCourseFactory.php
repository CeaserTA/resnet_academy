<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseSectionStatus;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CohortCourse>
 */
final class CohortCourseFactory extends Factory
{
    protected $model = CohortCourse::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'cohort_id' => Cohort::factory(),
            'capacity' => $this->faker->optional(0.6)->numberBetween(10, 50),
            'seats_taken' => 0,
            // A random status here (as this used to be) makes every test that creates a
            // cohort_course without an explicit ->open()/->draft() state flaky — capacity
            // checks and enrolment/transfer flows only succeed against 'open', so a random
            // pick fails outright for 4 of 5 statuses. Default to the happy path; tests that
            // specifically want another status already opt in via the named states below.
            'status' => CourseSectionStatus::Open,
            'primary_instructor_id' => User::factory(),
            'price_override' => null,
            'currency_override' => null,
        ];
    }

    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CourseSectionStatus::Open,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CourseSectionStatus::Draft,
        ]);
    }

    public function full(): static
    {
        return $this->state(function (array $attributes) {
            $capacity = $attributes['capacity'] ?? 20;
            return [
                'capacity' => $capacity,
                'seats_taken' => $capacity,
            ];
        });
    }

    public function withSeatsAvailable(int $capacity = 20, int $taken = 0): static
    {
        return $this->state(fn (array $attributes) => [
            'capacity' => $capacity,
            'seats_taken' => $taken,
        ]);
    }

    public function unlimited(): static
    {
        return $this->state(fn (array $attributes) => [
            'capacity' => null,
            'seats_taken' => 0,
        ]);
    }
}
