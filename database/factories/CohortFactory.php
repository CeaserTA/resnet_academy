<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CohortStatus;
use App\Models\Cohort;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cohort>
 */
final class CohortFactory extends Factory
{
    protected $model = Cohort::class;

    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('now', '+6 months');
        $endDate = $this->faker->dateTimeBetween($startDate, '+1 year');

        return [
            'name' => $this->faker->randomElement([
                'Spring 2026 Intake',
                'Fall 2026 Intake',
                'Summer 2026 Intensive',
                'January 2026 Intake',
                'September 2026 Intake',
            ]),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'application_deadline' => $this->faker->optional(0.7)->dateTimeBetween('now', $startDate),
            'status' => CohortStatus::Draft,
            'created_by' => User::factory()->admin(),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => ['status' => CohortStatus::Published]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => CohortStatus::Archived]);
    }
}
