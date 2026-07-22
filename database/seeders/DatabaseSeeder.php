<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Course;
use App\Models\LatePenaltyPolicy;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Resnet Admin',
            'email' => 'admin@resnet.test',
        ]);

        $instructor = User::factory()->instructor()->create([
            'name' => 'Sample Instructor',
            'email' => 'instructor@resnet.test',
        ]);

        User::factory()->student()->create([
            'name' => 'Sample Student',
            'email' => 'student@resnet.test',
        ]);

        $category = Category::factory()->create(['name' => 'Web Development', 'slug' => 'web-development']);

        $course = Course::factory()->create([
            'title' => 'Introduction to Laravel',
            'slug' => 'introduction-to-laravel',
            'category_id' => $category->id,
            'created_by' => $admin->id,
        ]);

        $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

        $latePenaltyPolicy = LatePenaltyPolicy::factory()->create(['name' => 'Standard Late Policy']);

        $latePenaltyPolicy->tiers()->createMany([
            ['hours_late_from' => 0, 'hours_late_to' => 24, 'penalty_percent' => 10],
            ['hours_late_from' => 24, 'hours_late_to' => 48, 'penalty_percent' => 25],
            ['hours_late_from' => 48, 'hours_late_to' => null, 'penalty_percent' => 50],
        ]);
    }
}
