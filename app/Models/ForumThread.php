<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ForumThreadFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

final class ForumThread extends Model
{
    /** @use HasFactory<ForumThreadFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'forum_id',
        'created_by',
        'title',
        'is_pinned',
        'is_locked',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'is_locked' => 'boolean',
    ];

    /**
     * @return BelongsTo<Forum, $this>
     */
    public function forum(): BelongsTo
    {
        return $this->belongsTo(Forum::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<ForumPost, $this>
     */
    public function posts(): HasMany
    {
        return $this->hasMany(ForumPost::class, 'thread_id');
    }

    /**
     * The feed redesign treats a thread's oldest post as the "feed post" itself (its body +
     * attachment) — everything else in the thread is a reply. `oldestOfMany()` keeps this a
     * real eager-loadable relation instead of a query hack.
     *
     * @return HasOne<ForumPost, $this>
     */
    public function headPost(): HasOne
    {
        return $this->hasOne(ForumPost::class, 'thread_id')->oldestOfMany();
    }
}
