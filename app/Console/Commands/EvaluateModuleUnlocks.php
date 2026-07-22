<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\EnrolmentStatus;
use App\Models\Enrolment;
use App\Services\Progress\ProgressEngine;
use Illuminate\Console\Command;

/**
 * Catches time-based unlocks (scheduled_start_at passing) even if nobody's browsing the
 * course — architecture.md §5.2 calls for both on-demand and scheduled evaluation.
 */
final class EvaluateModuleUnlocks extends Command
{
    protected $signature = 'progress:evaluate-module-unlocks';

    protected $description = 'Re-evaluate module unlock state for every confirmed enrolment';

    public function handle(ProgressEngine $progressEngine): int
    {
        $count = 0;

        Enrolment::query()
            ->where('status', EnrolmentStatus::Confirmed)
            ->with(['student', 'course'])
            ->chunk(200, function ($enrolments) use ($progressEngine, &$count): void {
                foreach ($enrolments as $enrolment) {
                    $progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
                    $count++;
                }
            });

        $this->info("Re-evaluated module unlocks for {$count} enrolment(s).");

        return self::SUCCESS;
    }
}
