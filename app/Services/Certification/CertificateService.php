<?php

declare(strict_types=1);

namespace App\Services\Certification;

use App\Jobs\GenerateCertificatePdf;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Str;

/**
 * architecture.md §5.4: triggered when the last module in a course completes for a student.
 * The certificate row (and its unique student+course number) is created synchronously so the
 * "exactly once" guarantee holds immediately; PDF rendering happens off the request cycle.
 */
final class CertificateService
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    public function issueForCourseCompletion(User $student, Course $course): Certificate
    {
        $certificate = Certificate::query()->firstOrCreate(
            ['student_id' => $student->id, 'course_id' => $course->id],
            ['certificate_number' => $this->generateCertificateNumber(), 'issued_at' => now()],
        );

        if ($certificate->wasRecentlyCreated) {
            GenerateCertificatePdf::dispatch($certificate->id);
            $this->notificationDispatcher->notifyCertificateIssued($certificate);
        }

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
