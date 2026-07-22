<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
final class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        return [
            'actor_id' => User::factory(),
            'action' => 'enrolment.confirmed',
            'entity_type' => 'enrolment',
            'entity_id' => fake()->numberBetween(1, 1000),
            'meta' => [],
        ];
    }
}
