<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class VideoWatchPing extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'student_id',
        'resource_id',
        'position_seconds',
        'pinged_at',
    ];

    protected $casts = [
        'position_seconds' => 'integer',
        'pinged_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}
