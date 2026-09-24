<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Certificate;
use App\Services\Certification\CertificateService;
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

    public function handle(CertificateService $certificateService): void
    {
        $certificate = Certificate::query()->with(['student', 'course'])->find($this->certificateId);

        if (! $certificate) {
            return;
        }

        // Shared with the download endpoint, which renders on demand when no worker has got to
        // it yet — ensurePdf() is idempotent, so arriving second here is a no-op.
        $certificateService->ensurePdf($certificate);
    }

    public function failed(\Throwable $e): void
    {
        logger()->error('GenerateCertificatePdf failed', [
            'certificate_id' => $this->certificateId,
            'error' => $e->getMessage(),
        ]);
    }
}
