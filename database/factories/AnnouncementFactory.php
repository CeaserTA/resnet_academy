<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
final class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'posted_by' => User::factory(),
            'title' => fake()->sentence(4),
            'body' => fake()->paragraph(),
        ];
    }
}
