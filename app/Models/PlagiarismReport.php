<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class PlagiarismReport extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'submission_id',
        'similarity_score',
        'report_url',
        'checked_at',
    ];

    protected $casts = [
        'similarity_score' => 'decimal:2',
        'checked_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<AssignmentSubmission, $this>
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(AssignmentSubmission::class, 'submission_id');
    }
}
