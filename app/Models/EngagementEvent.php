<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\EngagementEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class EngagementEvent extends Model
{
    /** @use HasFactory<EngagementEventFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'student_id',
        'course_id',
        'event_type',
        'event_meta',
    ];

    protected $casts = [
        'event_meta' => 'array',
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
}
