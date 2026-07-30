<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseApplicationStatus;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseApplication>
 */
final class CourseApplicationFactory extends Factory
{
    protected $model = CourseApplication::class;

    public function definition(): array
    {
        return [
            'student_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'status' => CourseApplicationStatus::Pending,
            'answers' => [fake()->sentence()],
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CourseApplicationStatus::Approved,
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CourseApplicationStatus::Rejected,
            'reviewed_at' => now(),
        ]);
    }
}
