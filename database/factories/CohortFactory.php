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

    /**
     * A cohort that is already running, because content is gated on `start_date` and most tests
     * need a course a student can actually open. Use `upcoming()` for an intake that has not
     * begun, which is the state that keeps module content locked.
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('-3 months', '-1 week');
        $endDate = $this->faker->dateTimeBetween('+1 month', '+6 months');

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
            'application_deadline' => $this->faker->optional(0.7)->dateTimeBetween(
                (clone $startDate)->modify('-30 days'),
                $startDate,
            ),
            'status' => CohortStatus::Draft,
            'created_by' => User::factory()->admin(),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => ['status' => CohortStatus::Published]);
    }

    /** An intake that has not begun — its course content stays locked until `start_date`. */
    public function upcoming(): static
    {
        return $this->state(function (array $attributes): array {
            $startDate = $this->faker->dateTimeBetween('+2 weeks', '+6 months');

            return [
                'start_date' => $startDate,
                'end_date' => $this->faker->dateTimeBetween($startDate, '+1 year'),
                'application_deadline' => (clone $startDate)->modify('-7 days'),
            ];
        });
    }

    /** An intake that has already run its course. */
    public function finished(): static
    {
        return $this->state(fn (array $attributes): array => [
            'start_date' => now()->subMonths(8),
            'end_date' => now()->subMonths(2),
            'application_deadline' => now()->subMonths(9),
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => CohortStatus::Archived]);
    }
}
