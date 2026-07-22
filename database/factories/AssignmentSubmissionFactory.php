<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubmissionStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssignmentSubmission>
 */
final class AssignmentSubmissionFactory extends Factory
{
    protected $model = AssignmentSubmission::class;

    public function definition(): array
    {
        return [
            'assignment_id' => Assignment::factory(),
            'student_id' => User::factory()->student(),
            'attempt_number' => 1,
            'text_content' => fake()->paragraph(),
            'submitted_at' => now(),
            'is_late' => false,
            'late_penalty_percent' => 0,
            'status' => SubmissionStatus::Submitted,
        ];
    }
}
