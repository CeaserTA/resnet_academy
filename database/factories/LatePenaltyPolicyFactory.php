<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LatePenaltyPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LatePenaltyPolicy>
 */
final class LatePenaltyPolicyFactory extends Factory
{
    protected $model = LatePenaltyPolicy::class;

    public function definition(): array
    {
        return [
            'name' => 'Standard tiered penalty',
        ];
    }
}
