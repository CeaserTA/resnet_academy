<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseSectionStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseSection>
 */
final class CourseSectionFactory extends Factory
{
    protected $model = CourseSection::class;

    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('now', '+6 months');
        $endDate = $this->faker->dateTimeBetween($startDate, '+1 year');

        return [
            'course_id' => Course::factory(),
            'name' => $this->faker->randomElement([
                'Spring 2026 Cohort',
                'Fall 2026 Cohort',
                'Summer 2026 Intensive',
                'January 2026 Intake',
                'Evening Cohort',
                'Weekend Cohort',
            ]),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'application_deadline' => $this->faker->optional(0.7)->dateTimeBetween('now', $startDate),
            'capacity' => $this->faker->optional(0.6)->numberBetween(10, 50),
            'seats_taken' => 0,
            'status' => $this->faker->randomElement(CourseSectionStatus::cases()),
            'primary_instructor_id' => User::factory(),
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
