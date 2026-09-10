<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseSectionStatus;
use Database\Factories\CohortCourseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One course's offering within a cohort — capacity, seats, and instructor are per-offering,
 * while schedule (name/dates/application_deadline) is inherited from the parent `Cohort`.
 */
final class CohortCourse extends Model
{
    /** @use HasFactory<CohortCourseFactory> */
    use HasFactory;

    protected $fillable = [
        'course_id',
        'cohort_id',
        'capacity',
        'seats_taken',
        'status',
        'primary_instructor_id',
        'price_override',
        'currency_override',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'seats_taken' => 'integer',
        'status' => CourseSectionStatus::class,
        'price_override' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<Cohort, $this>
     */
    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function primaryInstructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_instructor_id');
    }

    /**
     * @return HasMany<Enrolment, $this>
     */
    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class, 'cohort_course_id');
    }

    /**
     * @return HasMany<CourseApplication, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(CourseApplication::class, 'cohort_course_id');
    }

    /**
     * The price/currency to charge for this offering: the cohort-specific override if set,
     * otherwise the course's default price.
     *
     * @return array{0: string, 1: string}
     */
    public function resolvedPrice(): array
    {
        return [
            $this->price_override !== null ? (string) $this->price_override : (string) $this->course->price,
            $this->currency_override ?? $this->course->currency,
        ];
    }

    /**
     * `seats_taken` is the authoritative counter `EnrolmentService` gates capacity on (kept in
     * sync via increment/decrement inside locked transactions) — this alias just exposes it
     * under the name the resource/API layer already expects, instead of independently
     * recomputing from a status list that could drift from what enrol() actually counts.
     */
    public function getEnrolledCountAttribute(): int
    {
        return $this->seats_taken;
    }

    /**
     * Get available seats remaining.
     */
    public function getSeatsAvailableAttribute(): ?int
    {
        if ($this->capacity === null) {
            return null; // Unlimited capacity
        }

        return max(0, $this->capacity - $this->seats_taken);
    }

    /**
     * Check if this offering has reached capacity.
     */
    public function isFull(): bool
    {
        return $this->capacity !== null && $this->seats_taken >= $this->capacity;
    }

    /**
     * Check if this offering is currently accepting applications — status is per-offering,
     * the application deadline is the parent cohort's.
     */
    public function isAcceptingApplications(): bool
    {
        if ($this->status !== CourseSectionStatus::Open) {
            return false;
        }

        $deadline = $this->cohort?->application_deadline;

        if ($deadline !== null && $deadline->isPast()) {
            return false;
        }

        return true;
    }
}
