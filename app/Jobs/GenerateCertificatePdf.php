<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Certificate;
use App\Services\Storage\MediaStorageService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * architecture.md §5.4: PDF rendering happens off the request cycle. ShouldBeUnique on the
 * certificate id so a retry or a duplicate dispatch never renders/stores the same PDF twice.
 */
final class GenerateCertificatePdf implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(public readonly int $certificateId) {}

    public function uniqueId(): string
    {
        return (string) $this->certificateId;
    }

    public function handle(MediaStorageService $mediaStorage): void
    {
        $certificate = Certificate::query()->with(['student', 'course'])->find($this->certificateId);

        if (! $certificate || $certificate->certificate_url !== null) {
            return;
        }

        $pdf = Pdf::loadView('certificates.pdf', [
            'studentName' => $certificate->student->name,
            'courseTitle' => $certificate->course->title,
            'certificateNumber' => $certificate->certificate_number,
            'issuedAt' => $certificate->issued_at->toFormattedDateString(),
        ]);

        $path = "certificates/{$certificate->certificate_number}.pdf";
        $mediaStorage->putRaw($path, $pdf->output());

        // Stores the R2 *path*, not a full URL — CertificateResource/ProgressController resolve
        // it to a URL at read time via MediaStorageService::url(), same as every other upload.
        $certificate->update(['certificate_url' => $path]);
    }

    public function failed(\Throwable $e): void
    {
        logger()->error('GenerateCertificatePdf failed', [
            'certificate_id' => $this->certificateId,
            'error' => $e->getMessage(),
        ]);
    }
}
