<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Models\LatePenaltyPolicy;
use Carbon\Carbon;

/**
 * Tiered/stepped deduction (business rule "Late submission policy"): 0–24h late -10%,
 * 24–48h late -25%, 48h+ late -50%, configured per-policy via late_penalty_tiers rather
 * than hardcoded, so a course can define its own bands.
 */
final class LatePenaltyCalculator
{
    public function penaltyPercentFor(?LatePenaltyPolicy $policy, Carbon $dueAt, Carbon $submittedAt): float
    {
        if (! $policy || $submittedAt->lessThanOrEqualTo($dueAt)) {
            return 0.0;
        }

        $hoursLate = $dueAt->diffInHours($submittedAt);

        $tier = $policy->tiers()
            ->where('hours_late_from', '<=', $hoursLate)
            ->where(function ($query) use ($hoursLate): void {
                $query->whereNull('hours_late_to')->orWhere('hours_late_to', '>', $hoursLate);
            })
            ->orderByDesc('hours_late_from')
            ->first();

        return $tier ? (float) $tier->penalty_percent : 0.0;
    }
}
