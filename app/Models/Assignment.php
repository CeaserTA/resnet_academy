<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AssignmentSubmissionType;
use Database\Factories\AssignmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Assignment extends Model
{
    /** @use HasFactory<AssignmentFactory> */
    use HasFactory;

    protected $fillable = [
        'module_id',
        'title',
        'instructions',
        'submission_type',
        'due_at',
        'allow_late',
        'late_penalty_policy_id',
        'max_score',
        'plagiarism_check_enabled',
    ];

    protected $casts = [
        'submission_type' => AssignmentSubmissionType::class,
        'due_at' => 'datetime',
        'allow_late' => 'boolean',
        'max_score' => 'decimal:2',
        'plagiarism_check_enabled' => 'boolean',
    ];

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return BelongsTo<LatePenaltyPolicy, $this>
     */
    public function latePenaltyPolicy(): BelongsTo
    {
        return $this->belongsTo(LatePenaltyPolicy::class, 'late_penalty_policy_id');
    }

    /**
     * @return HasMany<AssignmentRubric, $this>
     */
    public function rubrics(): HasMany
    {
        return $this->hasMany(AssignmentRubric::class);
    }

    /**
     * @return HasMany<AssignmentSubmission, $this>
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }
}
