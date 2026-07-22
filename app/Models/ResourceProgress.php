<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ResourceProgressStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ResourceProgress extends Model
{
    public const CREATED_AT = null;

    protected $fillable = [
        'student_id',
        'resource_id',
        'status',
        'watch_percent',
        'marked_read_at',
        'opened_at',
        'completed_at',
    ];

    protected $casts = [
        'status' => ResourceProgressStatus::class,
        'watch_percent' => 'decimal:2',
        'marked_read_at' => 'datetime',
        'opened_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<\App\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}
