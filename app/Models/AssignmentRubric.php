<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AssignmentRubricFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class AssignmentRubric extends Model
{
    /** @use HasFactory<AssignmentRubricFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'assignment_id',
        'criterion',
        'max_points',
        'order_index',
    ];

    protected $casts = [
        'max_points' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Assignment, $this>
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    /**
     * @return HasMany<AssignmentSubmissionRubricScore, $this>
     */
    public function scores(): HasMany
    {
        return $this->hasMany(AssignmentSubmissionRubricScore::class, 'rubric_id');
    }
}
