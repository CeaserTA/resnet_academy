<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewStatus;
use Database\Factories\CourseReviewFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class CourseReview extends Model
{
    /** @use HasFactory<CourseReviewFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'rating',
        'review_text',
        'status',
        'admin_notes',
        'is_featured',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'status' => ReviewStatus::class,
        'is_featured' => 'bool',
        'reviewed_at' => 'datetime',
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
}
