<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\CohortCourse;
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
            'cohort_course_id' => null,
            'status' => EnrolmentStatus::Confirmed,
            'source' => EnrolmentSource::Self,
            'applied_at' => $appliedAt,
            'confirmation_email_due_at' => $appliedAt->clone()->addHours(24),
        ];
    }

    /**
     * Resolved after `course_id` overrides (explicit array key, ->for(), states) have already
     * been applied, so the default cohort_course_id always belongs to the FINAL course_id —
     * not whichever course a naive eager default in definition() would have guessed at.
     *
     * The auto-created cohort_course's seats_taken is seeded to 1 when the enrolment's own
     * status holds a seat (Confirmed or TransferRequested — mirrors EnrolmentService's own
     * accounting), 0 otherwise (e.g. Waitlisted never counts against capacity). Without this,
     * any test creating a Confirmed/TransferRequested enrolment via the bare factory produces
     * a cohort_course that thinks it has 0 seats taken — fine until something later releases
     * that "held" seat (withdraw, transfer, refund), which decrements an unsigned column
     * already at 0 and crashes with a DB-level integer underflow.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (Enrolment $enrolment): void {
            if ($enrolment->cohort_course_id === null) {
                $holdsSeat = in_array($enrolment->status, [EnrolmentStatus::Confirmed, EnrolmentStatus::TransferRequested], true);

                $enrolment->cohort_course_id = CohortCourse::factory()
                    ->for($enrolment->course)
                    ->open()
                    ->create(['seats_taken' => $holdsSeat ? 1 : 0])
                    ->id;
            }
        });
    }
}
