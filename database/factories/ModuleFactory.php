<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Module>
 */
final class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => fake()->unique()->sentence(3),
            'description' => fake()->paragraph(),
            'order_index' => 1,
            'scheduled_start_at' => null,
        ];
    }
}
