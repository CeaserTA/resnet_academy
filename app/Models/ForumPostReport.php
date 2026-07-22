<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ForumPostReportStatus;
use Database\Factories\ForumPostReportFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ForumPostReport extends Model
{
    /** @use HasFactory<ForumPostReportFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'post_id',
        'reported_by',
        'reason',
        'status',
    ];

    protected $casts = [
        'status' => ForumPostReportStatus::class,
    ];

    /**
     * @return BelongsTo<ForumPost, $this>
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(ForumPost::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
