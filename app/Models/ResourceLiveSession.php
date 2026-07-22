<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LiveSessionProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ResourceLiveSession extends Model
{
    protected $primaryKey = 'resource_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'provider',
        'meeting_url',
        'scheduled_at',
        'duration_minutes',
    ];

    protected $casts = [
        'provider' => LiveSessionProvider::class,
        'scheduled_at' => 'datetime',
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }
}
