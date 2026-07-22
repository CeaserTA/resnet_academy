<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LatePenaltyPolicy;
use App\Models\LatePenaltyTier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LatePenaltyTier>
 */
final class LatePenaltyTierFactory extends Factory
{
    protected $model = LatePenaltyTier::class;

    public function definition(): array
    {
        return [
            'policy_id' => LatePenaltyPolicy::factory(),
            'hours_late_from' => 0,
            'hours_late_to' => 24,
            'penalty_percent' => 10,
        ];
    }
}
