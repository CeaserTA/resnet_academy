<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ForumTagFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class ForumTag extends Model
{
    /** @use HasFactory<ForumTagFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'slug',
    ];

    /**
     * @return BelongsToMany<ForumThread, $this>
     */
    public function threads(): BelongsToMany
    {
        return $this->belongsToMany(ForumThread::class, 'forum_thread_tag', 'tag_id', 'thread_id');
    }
}
