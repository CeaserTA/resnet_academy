<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EvaluationAttemptStatus;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EvaluationAttempt>
 */
final class EvaluationAttemptFactory extends Factory
{
    protected $model = EvaluationAttempt::class;

    public function definition(): array
    {
        return [
            'evaluation_id' => Evaluation::factory(),
            'student_id' => User::factory()->student(),
            'attempt_number' => 1,
            'started_at' => now(),
            'status' => EvaluationAttemptStatus::InProgress,
        ];
    }
}
