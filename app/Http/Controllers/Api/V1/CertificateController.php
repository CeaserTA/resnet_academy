<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\CertificateVerificationResource;
use App\Models\Certificate;
use App\Services\Certification\CertificateService;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CertificateController extends Controller
{
    public function __construct(private readonly MediaStorageService $mediaStorage) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $certificates = Certificate::query()
            ->where('student_id', $request->user()->id)
            ->with('course')
            ->latest('issued_at')
            ->get();

        return CertificateResource::collection($certificates);
    }

    public function show(Certificate $certificate): CertificateResource
    {
        $this->authorize('view', $certificate);

        return new CertificateResource($certificate->load(['course', 'student']));
    }

    /**
     * Renders the PDF on the spot if the queued job hasn't produced it yet, then redirects to
     * the stored file. This is what makes a certificate reachable the moment it is issued
     * rather than whenever a queue worker next runs — with no worker at all, the first click
     * generates it.
     */
    public function download(Certificate $certificate, CertificateService $certificateService): RedirectResponse
    {
        $this->authorize('view', $certificate);

        $url = $this->mediaStorage->url($certificateService->ensurePdf($certificate));

        abort_if($url === null, 404, 'This certificate file could not be found.');

        return redirect()->away($url);
    }

    /**
     * FR "Certificate verification view" — public, no auth: anyone holding a printed
     * certificate can confirm it's genuine by its number.
     */
    public function verify(string $certificateNumber): CertificateVerificationResource
    {
        $certificate = Certificate::query()
            ->where('certificate_number', trim($certificateNumber))
            ->with(['course', 'student'])
            ->first();

        // Not firstOrFail(): its 404 message is "No query results for model
        // [App\Models\Certificate]", which this public, unauthenticated page would show verbatim
        // to an employer. "Not found" is an expected answer here, not an internal error.
        abort_if($certificate === null, 404, 'No certificate was found with that number. Check it matches the one printed on the certificate.');

        return new CertificateVerificationResource($certificate);
    }
}
