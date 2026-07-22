<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\NotificationChannel;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
final class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'channel' => NotificationChannel::InApp,
            'type' => 'test_notification',
            'title' => fake()->sentence(4),
            'is_read' => false,
            'sent_at' => now(),
        ];
    }
}
