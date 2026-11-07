<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Extra attempts on one evaluation for one student, granted by staff (BACKEND_CHANGES.md §3).
 */
final class EvaluationAttemptAllowance extends Model
{
    protected $fillable = [
        'evaluation_id',
        'student_id',
        'extra_attempts',
        'granted_by',
        'reason',
    ];

    protected $casts = [
        'extra_attempts' => 'integer',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
