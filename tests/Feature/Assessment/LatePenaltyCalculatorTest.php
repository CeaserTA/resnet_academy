<?php

declare(strict_types=1);

use App\Models\LatePenaltyPolicy;
use App\Services\Assessment\LatePenaltyCalculator;
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    $this->policy = LatePenaltyPolicy::factory()->create();
    $this->policy->tiers()->createMany([
        ['hours_late_from' => 0, 'hours_late_to' => 24, 'penalty_percent' => 10],
        ['hours_late_from' => 24, 'hours_late_to' => 48, 'penalty_percent' => 25],
        ['hours_late_from' => 48, 'hours_late_to' => null, 'penalty_percent' => 50],
    ]);
    $this->calculator = new LatePenaltyCalculator;
});

it('applies no penalty when submitted on or before the due date', function (): void {
    $dueAt = Carbon::parse('2026-01-01 12:00:00');

    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()))->toBe(0.0);
    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->subMinute()))->toBe(0.0);
});

it('applies no penalty when there is no policy at all, even if late', function (): void {
    $dueAt = Carbon::parse('2026-01-01 12:00:00');

    expect($this->calculator->penaltyPercentFor(null, $dueAt, $dueAt->clone()->addDay()))->toBe(0.0);
});

it('applies the first band for 0-24h late', function (): void {
    $dueAt = Carbon::parse('2026-01-01 12:00:00');

    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addHour()))->toBe(10.0);
    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addHours(23)))->toBe(10.0);
});

it('applies the second band exactly at the 24h boundary', function (): void {
    $dueAt = Carbon::parse('2026-01-01 12:00:00');

    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addHours(24)))->toBe(25.0);
    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addHours(47)))->toBe(25.0);
});

it('applies the third band exactly at the 48h boundary and beyond', function (): void {
    $dueAt = Carbon::parse('2026-01-01 12:00:00');

    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addHours(48)))->toBe(50.0);
    expect($this->calculator->penaltyPercentFor($this->policy, $dueAt, $dueAt->clone()->addDays(30)))->toBe(50.0);
});
