<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ForumFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Forum extends Model
{
    /** @use HasFactory<ForumFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'course_id',
        'title',
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return HasMany<ForumThread, $this>
     */
    public function threads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }
}
