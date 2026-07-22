<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
final class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'student_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'amount' => fake()->randomElement(['0.00', '49.99', '99.99', '150000.00']),
            'currency' => 'UGX',
            'status' => OrderStatus::Pending,
        ];
    }

    public function paid(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Paid,
            'payment_method' => fake()->randomElement(['mobile_money', 'card', 'bank_transfer']),
            'paid_at' => now(),
        ]);
    }
}
