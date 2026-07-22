<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\CertificateVerificationResource;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CertificateController extends Controller
{
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
     * FR "Certificate verification view" — public, no auth: anyone holding a printed
     * certificate can confirm it's genuine by its number.
     */
    public function verify(string $certificateNumber): CertificateVerificationResource
    {
        $certificate = Certificate::query()
            ->where('certificate_number', $certificateNumber)
            ->with(['course', 'student'])
            ->firstOrFail();

        return new CertificateVerificationResource($certificate);
    }
}
