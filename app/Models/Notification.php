<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\NotificationChannel;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'channel',
        'type',
        'title',
        'body',
        'related_entity_type',
        'related_entity_id',
        'is_read',
        'sent_at',
    ];

    protected $casts = [
        'channel' => NotificationChannel::class,
        'is_read' => 'boolean',
        'sent_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
