<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Assignment;
use App\Models\AssignmentRubric;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssignmentRubric>
 */
final class AssignmentRubricFactory extends Factory
{
    protected $model = AssignmentRubric::class;

    public function definition(): array
    {
        return [
            'assignment_id' => Assignment::factory(),
            'criterion' => fake()->sentence(3),
            'max_points' => 10,
            'order_index' => 1,
        ];
    }
}
