<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EngagementEvent>
 */
final class EngagementEventFactory extends Factory
{
    protected $model = EngagementEvent::class;

    public function definition(): array
    {
        return [
            'student_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'event_type' => 'login',
            'event_meta' => null,
        ];
    }
}
