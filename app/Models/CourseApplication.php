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
        'section_id',
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
     * @return BelongsTo<CourseSection, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(CourseSection::class, 'section_id');
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

    /**
     * Batch variant of `recommendedCourses()` for lists: resolves the recommended courses of a
     * whole page of applications with a single `whereIn` query and attaches each result set under
     * the `recommendedCourses` relation key, so the resource can render them without issuing one
     * query per row. The JSON column can't be a real Eloquent relation, hence this manual
     * eager-load.
     *
     * @param  Collection<int, self>  $applications
     */
    public static function loadRecommendedCourses(Collection $applications): void
    {
        if ($applications->isEmpty()) {
            return;
        }

        $courseIds = $applications
            ->flatMap(fn (self $application): array => $application->recommended_course_ids ?? [])
            ->unique()
            ->values()
            ->all();

        $coursesById = $courseIds === []
            ? collect()
            : Course::query()->whereIn('id', $courseIds)->get()->keyBy('id');

        foreach ($applications as $application) {
            $application->setRelation(
                'recommendedCourses',
                collect($application->recommended_course_ids ?? [])
                    ->map(fn (int $courseId): ?Course => $coursesById->get($courseId))
                    ->filter()
                    ->values(),
            );
        }
    }
}
