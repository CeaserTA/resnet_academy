<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Forum;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Forum>
 */
final class ForumFactory extends Factory
{
    protected $model = Forum::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => 'General Discussion',
        ];
    }
}
