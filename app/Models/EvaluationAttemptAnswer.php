<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class EvaluationAttemptAnswer extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'attempt_id',
        'question_id',
        'selected_option_ids',
        'answer_text',
        'is_correct',
        'points_awarded',
        'graded_by',
        'graded_at',
    ];

    protected $casts = [
        'selected_option_ids' => 'array',
        'is_correct' => 'boolean',
        'points_awarded' => 'decimal:2',
        'graded_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<EvaluationAttempt, $this>
     */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(EvaluationAttempt::class);
    }

    /**
     * @return BelongsTo<Question, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function gradedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }
}
