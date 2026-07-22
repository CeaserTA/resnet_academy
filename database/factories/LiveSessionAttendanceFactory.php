<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LiveSessionAttendance;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LiveSessionAttendance>
 */
final class LiveSessionAttendanceFactory extends Factory
{
    protected $model = LiveSessionAttendance::class;

    public function definition(): array
    {
        return [
            'resource_id' => Resource::factory(),
            'student_id' => User::factory()->student(),
            'attended' => true,
            'marked_at' => now(),
        ];
    }
}
