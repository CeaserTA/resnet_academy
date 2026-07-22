<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EvaluationAttemptStatus;
use Database\Factories\EvaluationAttemptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class EvaluationAttempt extends Model
{
    /** @use HasFactory<EvaluationAttemptFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'evaluation_id',
        'student_id',
        'attempt_number',
        'started_at',
        'submitted_at',
        'score_percent',
        'passed',
        'status',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'score_percent' => 'decimal:2',
        'passed' => 'boolean',
        'status' => EvaluationAttemptStatus::class,
    ];

    /**
     * @return BelongsTo<Evaluation, $this>
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return HasMany<EvaluationAttemptAnswer, $this>
     */
    public function answers(): HasMany
    {
        return $this->hasMany(EvaluationAttemptAnswer::class, 'attempt_id');
    }
}
