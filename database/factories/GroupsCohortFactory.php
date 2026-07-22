<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\GroupsCohort;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GroupsCohort>
 */
final class GroupsCohortFactory extends Factory
{
    protected $model = GroupsCohort::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
        ];
    }
}
