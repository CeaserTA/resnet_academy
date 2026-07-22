<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Enrolment>
 */
final class EnrolmentFactory extends Factory
{
    protected $model = Enrolment::class;

    public function definition(): array
    {
        $appliedAt = Carbon::instance(fake()->dateTimeBetween('-1 month', 'now'));

        return [
            'student_id' => User::factory()->student(),
            'course_id' => Course::factory(),
            'status' => EnrolmentStatus::Confirmed,
            'source' => EnrolmentSource::Self,
            'applied_at' => $appliedAt,
            'confirmation_email_due_at' => $appliedAt->clone()->addHours(24),
        ];
    }
}
