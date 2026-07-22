<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LatePenaltyTierFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LatePenaltyTier extends Model
{
    /** @use HasFactory<LatePenaltyTierFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'policy_id',
        'hours_late_from',
        'hours_late_to',
        'penalty_percent',
    ];

    protected $casts = [
        'penalty_percent' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<LatePenaltyPolicy, $this>
     */
    public function policy(): BelongsTo
    {
        return $this->belongsTo(LatePenaltyPolicy::class, 'policy_id');
    }
}
