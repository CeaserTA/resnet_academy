<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class AssignmentSubmissionRubricScore extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'submission_id',
        'rubric_id',
        'score',
        'comment',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<AssignmentSubmission, $this>
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(AssignmentSubmission::class, 'submission_id');
    }

    /**
     * @return BelongsTo<AssignmentRubric, $this>
     */
    public function rubric(): BelongsTo
    {
        return $this->belongsTo(AssignmentRubric::class, 'rubric_id');
    }
}
