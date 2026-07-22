<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Models\Enrolment;
use Illuminate\Console\Command;

/**
 * Sweeps for enrolments whose confirmation email is due but wasn't sent — catches cases where
 * the original delayed dispatch was lost (queue restart, etc.), per architecture.md §5.1.
 */
final class SendDueConfirmationEmails extends Command
{
    protected $signature = 'enrolments:send-due-confirmation-emails';

    protected $description = 'Dispatch confirmation emails for enrolments past their due time that have not been sent yet';

    public function handle(): int
    {
        $dueEnrolmentIds = Enrolment::query()
            ->whereNull('confirmation_email_sent_at')
            ->where('confirmation_email_due_at', '<=', now())
            ->pluck('id');

        foreach ($dueEnrolmentIds as $enrolmentId) {
            SendEnrolmentConfirmationEmail::dispatch($enrolmentId);
        }

        $this->info("Dispatched {$dueEnrolmentIds->count()} due confirmation email(s).");

        return self::SUCCESS;
    }
}
