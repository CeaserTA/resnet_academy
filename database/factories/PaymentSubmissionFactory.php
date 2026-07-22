<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PaymentSubmissionStatus;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentSubmission>
 */
final class PaymentSubmissionFactory extends Factory
{
    protected $model = PaymentSubmission::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'amount' => '50000.00',
            'receipt_path' => 'payment-receipts/fake/'.fake()->uuid().'.jpg',
            'receipt_original_name' => 'receipt.jpg',
            'status' => PaymentSubmissionStatus::Pending,
        ];
    }

    public function confirmed(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentSubmissionStatus::Confirmed,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentSubmissionStatus::Rejected,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }
}
