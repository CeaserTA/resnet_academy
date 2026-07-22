<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LatePenaltyPolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class LatePenaltyPolicy extends Model
{
    /** @use HasFactory<LatePenaltyPolicyFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'name',
    ];

    /**
     * @return HasMany<LatePenaltyTier, $this>
     */
    public function tiers(): HasMany
    {
        return $this->hasMany(LatePenaltyTier::class, 'policy_id');
    }

    /**
     * @return HasMany<Assignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'late_penalty_policy_id');
    }
}
