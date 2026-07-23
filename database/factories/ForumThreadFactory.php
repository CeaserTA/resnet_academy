<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Forum;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumThread>
 */
final class ForumThreadFactory extends Factory
{
    protected $model = ForumThread::class;

    public function definition(): array
    {
        return [
            'forum_id' => Forum::factory(),
            'created_by' => User::factory(),
            'title' => fake()->sentence(4),
            'is_pinned' => false,
            'is_locked' => false,
            'solved' => false,
            'last_activity_at' => now(),
        ];
    }
}
