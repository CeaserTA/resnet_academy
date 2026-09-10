<?php

declare(strict_types=1);

namespace App\Services\Certification;

use App\Jobs\GenerateCertificatePdf;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * architecture.md §5.4: triggered when the last module in a course completes for a student.
 * The certificate row (and its unique student+course number) is created synchronously so the
 * "exactly once" guarantee holds immediately; PDF rendering happens off the request cycle.
 */
final class CertificateService
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    /**
     * Note: this is called from inside callers that already hold their own transaction
     * (EvaluationAttemptService::finalizeScore(), ProgressEngine::rollupModuleCompletion()), so
     * DB::transaction() here nests as a savepoint rather than a fresh top-level transaction. That
     * is safe under Laravel's savepoint semantics as long as nothing between the layers catches
     * and swallows an exception from this method — true today, but worth re-checking if that
     * ever changes.
     */
    public function issueForCourseCompletion(User $student, Course $course): Certificate
    {
        $certificate = DB::transaction(function () use ($student, $course): Certificate {
            $certificate = Certificate::query()->firstOrCreate(
                ['student_id' => $student->id, 'course_id' => $course->id],
                ['certificate_number' => $this->generateCertificateNumber(), 'issued_at' => now()],
            );

            if ($certificate->wasRecentlyCreated) {
                // Deferred to after the transaction commits: dispatched inline, a worker on a
                // non-database queue driver could pick this job up before the certificate row
                // (and the outer transaction it may be nested in) actually commits.
                GenerateCertificatePdf::dispatch($certificate->id)->afterCommit();
                $this->notificationDispatcher->notifyCertificateIssued($certificate);
            }

            return $certificate;
        });

        return $certificate;
    }

    private function generateCertificateNumber(): string
    {
        do {
            $number = 'CERT-'.strtoupper(Str::random(12));
        } while (Certificate::query()->where('certificate_number', $number)->exists());

        return $number;
    }
}
