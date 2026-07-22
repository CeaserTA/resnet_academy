<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LiveSessionAttendanceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LiveSessionAttendance extends Model
{
    /** @use HasFactory<LiveSessionAttendanceFactory> */
    use HasFactory;

    protected $table = 'live_session_attendance';

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'student_id',
        'attended',
        'marked_at',
        'marked_by',
    ];

    protected $casts = [
        'attended' => 'boolean',
        'marked_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<\App\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
