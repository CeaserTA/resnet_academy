<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Course;
use App\Models\LatePenaltyPolicy;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@resnet.test'],
            [
                'role' => UserRole::Admin,
                'name' => 'Resnet Admin',
                'email_verified_at' => now(),
                'password_hash' => Hash::make('password'),
                'status' => UserStatus::Active,
            ]
        );

        $instructor = User::updateOrCreate(
            ['email' => 'instructor@resnet.test'],
            [
                'role' => UserRole::Instructor,
                'name' => 'Sample Instructor',
                'email_verified_at' => now(),
                'password_hash' => Hash::make('password'),
                'status' => UserStatus::Active,
            ]
        );

        User::updateOrCreate(
            ['email' => 'student@resnet.test'],
            [
                'role' => UserRole::Student,
                'name' => 'Sample Student',
                'email_verified_at' => now(),
                'password_hash' => Hash::make('password'),
                'status' => UserStatus::Active,
            ]
        );

        $category = Category::updateOrCreate(
            ['slug' => 'web-development'],
            ['name' => 'Web Development']
        );

        $course = Course::updateOrCreate(
            ['slug' => 'introduction-to-laravel'],
            [
                'title' => 'Introduction to Laravel',
                'category_id' => $category->id,
                'created_by' => $admin->id,
            ]
        );

        $course->instructors()->syncWithoutDetaching([
            $instructor->id => ['is_primary' => true, 'assigned_at' => now()],
        ]);

        $latePenaltyPolicy = LatePenaltyPolicy::firstOrCreate(['name' => 'Standard Late Policy']);

        $latePenaltyPolicy->tiers()->updateOrCreate(
            ['hours_late_from' => 0, 'hours_late_to' => 24],
            ['penalty_percent' => 10]
        );
        $latePenaltyPolicy->tiers()->updateOrCreate(
            ['hours_late_from' => 24, 'hours_late_to' => 48],
            ['penalty_percent' => 25]
        );
        $latePenaltyPolicy->tiers()->updateOrCreate(
            ['hours_late_from' => 48, 'hours_late_to' => null],
            ['penalty_percent' => 50]
        );
    }
}
