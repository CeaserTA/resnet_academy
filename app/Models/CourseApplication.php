<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseApplicationStatus;
use Database\Factories\CourseApplicationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

final class CourseApplication extends Model
{
    /** @use HasFactory<CourseApplicationFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'status',
        'answers',
        'portfolio_url',
        'alternative_proof_text',
        'rejection_reason',
        'dismissed_at',
        'reviewed_by',
        'reviewed_at',
        'recommended_course_ids',
    ];

    protected $casts = [
        'status' => CourseApplicationStatus::class,
        'answers' => 'array',
        'recommended_course_ids' => 'array',
        'reviewed_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

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
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Not a real relation — `recommended_course_ids` is a plain JSON array (set on reject), not a
     * pivot table, so this is just a lookup helper for the resource layer.
     *
     * @return Collection<int, Course>
     */
    public function recommendedCourses(): Collection
    {
        if ($this->recommended_course_ids === null || $this->recommended_course_ids === []) {
            return collect();
        }

        return Course::query()->whereIn('id', $this->recommended_course_ids)->get();
    }
}
