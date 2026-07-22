<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Course;
use App\Models\LatePenaltyPolicy;
use App\Models\Order;
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

        // Seed a spread of orders so the admin Payments page (Receivables/Partials/Paid tabs)
        // has something to show without needing a real payment gateway (7.1 is still not started).
        // `amount` must be set via ->state() (applied before ->partial()/->paid() in the chain), not
        // as a create() override — create() overrides land after every state closure has already run,
        // so amount_paid would otherwise be derived from the factory's random default amount instead.
        Order::factory()->count(3)->create(['course_id' => $course->id, 'amount' => '150000.00']);
        Order::factory()->state(['amount' => '150000.00'])->partial()->count(2)->create(['course_id' => $course->id]);
        Order::factory()->state(['amount' => '150000.00'])->paid()->count(2)->create(['course_id' => $course->id]);

        $latePenaltyPolicy = LatePenaltyPolicy::factory()->create(['name' => 'Standard Late Policy']);

        $latePenaltyPolicy->tiers()->createMany([
            ['hours_late_from' => 0, 'hours_late_to' => 24, 'penalty_percent' => 10],
            ['hours_late_from' => 24, 'hours_late_to' => 48, 'penalty_percent' => 25],
            ['hours_late_from' => 48, 'hours_late_to' => null, 'penalty_percent' => 50],
        ]);
    }
}
