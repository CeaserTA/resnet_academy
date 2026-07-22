<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Evaluation;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Evaluation>
 */
final class EvaluationFactory extends Factory
{
    protected $model = Evaluation::class;

    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'title' => fake()->sentence(3),
            'pass_score' => 70,
            'randomize_questions' => false,
        ];
    }
}
