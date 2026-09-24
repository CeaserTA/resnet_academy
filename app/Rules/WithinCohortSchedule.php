<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Cohort;
use App\Models\Course;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Keeps a dated item under a course — a live session, an assignment deadline, an evaluation
 * window, a module's scheduled start — inside the date range of the cohort that course runs in.
 *
 * Dated items hang off the course, not off a cohort offering, while `cohort_courses` lets one
 * course run in any number of intakes. A single absolute date therefore cannot be correct for
 * two cohorts with different ranges, so this rule only enforces a range when the course belongs
 * to exactly one cohort, and refuses the save outright when it belongs to several rather than
 * silently picking one. See `Module::unlock_offset_days` for the cohort-relative alternative.
 *
 * Live sessions are the exception: they can be tied to one cohort (`$cohortId`), and then the
 * date is checked against that cohort's range alone, whatever else the course runs in. Pass
 * `$cohortSelectable` for those so the refusal on a multi-cohort course tells the admin to pick
 * a cohort, rather than suggesting they remove a date that a live session cannot do without.
 *
 * When editing, pass the value already saved as `$current`. A date that is being kept, not
 * changed, is never re-checked: the edit forms re-send every field on save, so without this an
 * untouched date would block an unrelated edit (a new title or meeting link) whenever the
 * stored date has since fallen outside its cohort, or the course has since gained a second
 * cohort. Only a date the user actually changes has to satisfy the range.
 */
final class WithinCohortSchedule implements ValidationRule
{
    public function __construct(
        private readonly ?Course $course,
        private readonly \DateTimeInterface|string|null $current = null,
        private readonly ?int $cohortId = null,
        private readonly bool $cohortSelectable = false,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->course === null || $value === null || $value === '') {
            return;
        }

        if ($this->isUnchanged($value)) {
            return;
        }

        $cohorts = $this->cohortId !== null
            ? Cohort::query()->whereKey($this->cohortId)->get()
            : $this->cohortsFor($this->course);

        // Not offered through any cohort: self-paced, so there is no range to sit inside.
        if ($cohorts->isEmpty()) {
            return;
        }

        if ($cohorts->count() > 1) {
            $fail(sprintf(
                '"%s" runs in %d cohorts with different schedules (%s), so a fixed date cannot apply to all of them. %s',
                $this->course->title,
                $cohorts->count(),
                $cohorts->map(fn (Cohort $cohort): string => $cohort->name)->implode(', '),
                $this->cohortSelectable
                    ? 'Choose the cohort this session is for, and its date will be checked against that cohort.'
                    : 'Remove the date, or run this course in a single cohort.',
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
     * Whether the submitted value is the date already saved. Compared to the minute, in UTC:
     * the edit forms use minute-precision inputs, so a stored value with stray seconds (for
     * example from a seeder or an import) comes back a few seconds earlier than it was saved.
     */
    private function isUnchanged(mixed $value): bool
    {
        $current = $this->current === null ? null : Carbon::make($this->current);

        if ($current === null) {
            return false;
        }

        try {
            $incoming = Carbon::parse((string) $value);
        } catch (\Exception) {
            return false;
        }

        return $incoming->copy()->utc()->format('Y-m-d H:i') === $current->copy()->utc()->format('Y-m-d H:i');
    }

    /**
     * The distinct cohorts this course is offered in. A `cohort_courses` row can predate cohorts
     * and carry no `cohort_id`, which is not a schedule and so is skipped.
     *
     * @return Collection<int, Cohort>
     */
    private function cohortsFor(Course $course): Collection
    {
        return Cohort::query()
            ->whereHas('cohortCourses', fn ($query) => $query->where('course_id', $course->id))
            ->orderBy('start_date')
            ->get();
    }
}
