<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\EnrolmentConfirmed;
use App\Models\Enrolment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * FR-4: fires at confirmation_email_due_at (course.confirmation_delay_hours after applying).
 * ShouldBeUnique on the enrolment id so a retry or a duplicate dispatch from the scheduled
 * sweep (architecture.md §5.1) never double-sends.
 */
final class SendEnrolmentConfirmationEmail implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(public readonly int $enrolmentId) {}

    public function uniqueId(): string
    {
        return (string) $this->enrolmentId;
    }

    public function handle(): void
    {
        $enrolment = Enrolment::query()->find($this->enrolmentId);

        if (! $enrolment || $enrolment->confirmation_email_sent_at !== null) {
            return;
        }

        Mail::to($enrolment->student->email)->send(new EnrolmentConfirmed($enrolment));

        $enrolment->update(['confirmation_email_sent_at' => now()]);
    }

    public function failed(\Throwable $e): void
    {
        logger()->error('SendEnrolmentConfirmationEmail failed', [
            'enrolment_id' => $this->enrolmentId,
            'error' => $e->getMessage(),
        ]);
    }
}
