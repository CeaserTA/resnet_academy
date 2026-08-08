<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
final class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'role' => UserRole::Student,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password_hash' => self::$password ??= Hash::make('password'),
            'status' => UserStatus::Active,
            // Progressive Student Profile Completion - Default complete profile
            'phone' => fake()->phoneNumber(),
            'country' => fake()->country(),
            'city' => fake()->city(),
            'highest_qualification' => fake()->randomElement([
                'High School',
                'Diploma',
                'Bachelor\'s Degree',
                'Master\'s Degree',
                'Doctorate',
                'Other',
            ]),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Admin]);
    }

    public function instructor(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Instructor]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Student]);
    }

    /**
     * Indicate that the user has an incomplete profile (for testing progressive completion).
     */
    public function incompleteProfile(): static
    {
        return $this->state(fn (array $attributes) => [
            'phone' => null,
            'country' => null,
            'city' => null,
            'highest_qualification' => null,
        ]);
    }
}
