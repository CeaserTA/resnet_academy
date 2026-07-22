<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AssignmentSubmissionType;
use App\Models\Assignment;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Assignment>
 */
final class AssignmentFactory extends Factory
{
    protected $model = Assignment::class;

    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'title' => fake()->sentence(4),
            'instructions' => fake()->paragraph(),
            'submission_type' => AssignmentSubmissionType::Both,
            'due_at' => now()->addWeek(),
            'allow_late' => true,
            'max_score' => 100,
            'plagiarism_check_enabled' => false,
        ];
    }
}
