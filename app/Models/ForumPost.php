<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ForumPostAttachmentType;
use Database\Factories\ForumPostFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class ForumPost extends Model
{
    /** @use HasFactory<ForumPostFactory> */
    use HasFactory;

    protected $fillable = [
        'thread_id',
        'user_id',
        'body',
        'attachment_type',
        'attachment_path',
        'attachment_original_name',
    ];

    protected $casts = [
        'attachment_type' => ForumPostAttachmentType::class,
    ];

    /**
     * @return BelongsTo<ForumThread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(ForumThread::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<ForumPostReport, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(ForumPostReport::class, 'post_id');
    }
}
