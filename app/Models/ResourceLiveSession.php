<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LiveSessionProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

final class ResourceLiveSession extends Model
{
    protected $primaryKey = 'resource_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'cohort_id',
        'provider',
        'meeting_url',
        'scheduled_at',
        'duration_minutes',
        'recording_url',
    ];

    protected $casts = [
        'cohort_id' => 'integer',
        'provider' => LiveSessionProvider::class,
        'scheduled_at' => 'datetime',
    ];

    /**
     * How long after a session's scheduled end a student may still click through and be recorded
     * as attended. Owned here rather than in ProgressEngine because the same window now decides
     * three things — whether a join is accepted, whether the student is shown the recording
     * instead, and whether an admin is told a recording is missing — and those must not drift.
     */
    public const JOIN_GRACE_PERIOD_MINUTES = 30;

    public function endsAt(): Carbon
    {
        return $this->scheduled_at->clone()->addMinutes($this->duration_minutes);
    }

    public function joinWindowIsOpen(): bool
    {
        $now = Carbon::now();

        return ! $now->lessThan($this->scheduled_at)
            && ! $now->greaterThan($this->endsAt()->addMinutes(self::JOIN_GRACE_PERIOD_MINUTES));
    }

    /** True once the session (plus its grace period) is over, so live attendance is no longer possible. */
    public function joinWindowHasClosed(): bool
    {
        return Carbon::now()->greaterThan($this->endsAt()->addMinutes(self::JOIN_GRACE_PERIOD_MINUTES));
    }

    /** A past session with no recording attached — the state that strands students. */
    public function isMissingRecording(): bool
    {
        return $this->joinWindowHasClosed() && ($this->recording_url === null || $this->recording_url === '');
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }

    /**
     * The cohort this session is run for. Null means it is for everyone taking the course.
     *
     * @return BelongsTo<Cohort, $this>
     */
    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }

    /** Whether a student in `$cohortId` (null when they are not in a cohort) is meant to attend. */
    public function isForCohort(?int $cohortId): bool
    {
        return $this->cohort_id === null || $this->cohort_id === $cohortId;
    }
}
