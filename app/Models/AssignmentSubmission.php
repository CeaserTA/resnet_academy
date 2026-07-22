<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubmissionStatus;
use Database\Factories\AssignmentSubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

final class AssignmentSubmission extends Model
{
    /** @use HasFactory<AssignmentSubmissionFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'assignment_id',
        'student_id',
        'attempt_number',
        'file_url',
        'text_content',
        'submitted_at',
        'is_late',
        'late_penalty_percent',
        'status',
        'raw_score',
        'final_score',
        'feedback',
        'graded_by',
        'graded_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'is_late' => 'boolean',
        'late_penalty_percent' => 'decimal:2',
        'status' => SubmissionStatus::class,
        'raw_score' => 'decimal:2',
        'final_score' => 'decimal:2',
        'graded_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Assignment, $this>
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
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
    public function gradedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    /**
     * @return HasMany<AssignmentSubmissionRubricScore, $this>
     */
    public function rubricScores(): HasMany
    {
        return $this->hasMany(AssignmentSubmissionRubricScore::class, 'submission_id');
    }

    /**
     * @return HasOne<PlagiarismReport, $this>
     */
    public function plagiarismReport(): HasOne
    {
        return $this->hasOne(PlagiarismReport::class, 'submission_id');
    }
}
