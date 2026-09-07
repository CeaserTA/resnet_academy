<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseApplicationStatus;
use App\Models\CohortCourse;
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
            'cohort_course_id' => null,
            'status' => CourseApplicationStatus::Pending,
            'answers' => [fake()->boolean()],
        ];
    }

    /**
     * Resolved after `course_id` overrides (explicit array key, ->for(), states) have already
     * been applied, so the default cohort_course_id always belongs to the FINAL course_id —
     * not whichever course a naive eager default in definition() would have guessed at.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (CourseApplication $application): void {
            if ($application->cohort_course_id === null) {
                $application->cohort_course_id = CohortCourse::factory()->for($application->course)->open()->create()->id;
            }
        });
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
