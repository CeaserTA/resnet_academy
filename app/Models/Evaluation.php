<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\EvaluationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Evaluation extends Model
{
    /** @use HasFactory<EvaluationFactory> */
    use HasFactory;

    protected $fillable = [
        'module_id',
        'title',
        'description',
        'instructions',
        'pass_score',
        'max_attempts',
        'time_limit_minutes',
        'randomize_questions',
        'questions_per_attempt',
        'available_from',
        'available_until',
    ];

    protected $casts = [
        'pass_score' => 'decimal:2',
        'randomize_questions' => 'boolean',
        'available_from' => 'datetime',
        'available_until' => 'datetime',
    ];

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return BelongsToMany<Question, $this>
     */
    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'evaluation_questions')->withPivot('order_index');
    }

    /**
     * @return HasMany<EvaluationAttempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(EvaluationAttempt::class);
    }
}
