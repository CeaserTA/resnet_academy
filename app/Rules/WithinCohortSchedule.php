<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Cohort;
use App\Models\Course;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Carbon;

/**
 * Keeps a dated item under a course — a live session, an assignment deadline, an evaluation
 * window, a module's scheduled start — inside the date range of the cohort that course runs in.
 *
 * Dated items hang off the course, not off a cohort offering, while `cohort_courses` lets one
 * course run in any number of intakes. A single absolute date therefore cannot be correct for
 * two cohorts with different ranges, so this rule only enforces a range when the course belongs
 * to exactly one cohort, and refuses the save outright when it belongs to several rather than
 * silently picking one. See `Module::unlock_offset_days` for the cohort-relative alternative.
 */
final class WithinCohortSchedule implements ValidationRule
{
    public function __construct(private readonly ?Course $course) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->course === null || $value === null || $value === '') {
            return;
        }

        $cohorts = $this->cohortsFor($this->course);

        // Not offered through any cohort: self-paced, so there is no range to sit inside.
        if ($cohorts->isEmpty()) {
            return;
        }

        if ($cohorts->count() > 1) {
            $fail(sprintf(
                '"%s" runs in %d cohorts with different schedules (%s), so a fixed date cannot apply to all of them. Remove the date, or run this course in a single cohort.',
                $this->course->title,
                $cohorts->count(),
                $cohorts->map(fn (Cohort $cohort): string => $cohort->name)->implode(', '),
            ));

            return;
        }

        $cohort = $cohorts->first();
        $start = $cohort->start_date?->copy()->startOfDay();
        $end = $cohort->end_date?->copy()->endOfDay();

        if ($start === null || $end === null) {
            return;
        }

        try {
            $date = Carbon::parse((string) $value);
        } catch (\Exception) {
            // Malformed input is the `date` rule's job to report, not this one's.
            return;
        }

        if ($date->lt($start) || $date->gt($end)) {
            $fail(sprintf(
                'This date must fall within the %s cohort, which runs %s to %s.',
                $cohort->name,
                $start->format('j M Y'),
                $end->format('j M Y'),
            ));
        }
    }

    /**
     * The distinct cohorts this course is offered in. A `cohort_courses` row can predate cohorts
     * and carry no `cohort_id`, which is not a schedule and so is skipped.
     *
     * @return \Illuminate\Support\Collection<int, Cohort>
     */
    private function cohortsFor(Course $course): \Illuminate\Support\Collection
    {
        return Cohort::query()
            ->whereHas('cohortCourses', fn ($query) => $query->where('course_id', $course->id))
            ->orderBy('start_date')
            ->get();
    }
}
