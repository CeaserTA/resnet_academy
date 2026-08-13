<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseSectionStatus;
use Database\Factories\CourseSectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class CourseSection extends Model
{
    /** @use HasFactory<CourseSectionFactory> */
    use HasFactory;

    protected $fillable = [
        'course_id',
        'name',
        'start_date',
        'end_date',
        'application_deadline',
        'capacity',
        'seats_taken',
        'status',
        'primary_instructor_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'application_deadline' => 'date',
        'capacity' => 'integer',
        'seats_taken' => 'integer',
        'status' => CourseSectionStatus::class,
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
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
        return $this->hasMany(Enrolment::class, 'section_id');
    }

    /**
     * @return HasMany<CourseApplication, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(CourseApplication::class, 'section_id');
    }

    /**
     * Get actual enrolled count (confirmed enrollments).
     */
    public function getEnrolledCountAttribute(): int
    {
        return $this->enrolments()->whereIn('status', [
            \App\Enums\EnrolmentStatus::Confirmed,
            \App\Enums\EnrolmentStatus::Waitlisted,
        ])->count();
    }

    /**
     * Get available seats remaining.
     */
    public function getSeatsAvailableAttribute(): ?int
    {
        if ($this->capacity === null) {
            return null; // Unlimited capacity
        }

        return max(0, $this->capacity - $this->enrolled_count);
    }

    /**
     * Check if this section has reached capacity.
     */
    public function isFull(): bool
    {
        return $this->capacity !== null && $this->enrolled_count >= $this->capacity;
    }

    /**
     * Check if this section is currently accepting applications.
     */
    public function isAcceptingApplications(): bool
    {
        if ($this->status !== CourseSectionStatus::Open) {
            return false;
        }

        if ($this->application_deadline !== null && $this->application_deadline->isPast()) {
            return false;
        }

        return true;
    }
}
