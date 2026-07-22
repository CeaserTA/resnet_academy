<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseLevel;
use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Course>
 */
final class CourseFactory extends Factory
{
    protected $model = Course::class;

    public function definition(): array
    {
        $title = fake()->unique()->catchPhrase();

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1000, 9999),
            'description' => fake()->paragraph(),
            'level' => fake()->randomElement(CourseLevel::cases()),
            'price' => fake()->randomFloat(2, 0, 500000),
            'currency' => 'UGX',
            'status' => CourseStatus::Published,
            'confirmation_delay_hours' => 24,
            'created_by' => User::factory()->admin(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => ['status' => CourseStatus::Draft]);
    }
}
