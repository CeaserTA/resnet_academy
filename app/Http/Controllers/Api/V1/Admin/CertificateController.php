<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCertificateResource;
use App\Models\Certificate;
use App\Models\Enrolment;
use App\Services\Certification\CertificateService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Admin-only certificate support screen: see every issued certificate, find one fast when a
 * student reports a problem, and re-run PDF generation for one that never finished. Downloading
 * reuses the regular /certificates/{id}/download endpoint, whose policy already admits admins.
 */
final class CertificateController extends Controller
{
    public function __construct(private readonly CertificateService $certificateService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Certificate::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'cohort_id' => ['nullable', 'integer', 'exists:cohorts,id'],
            'status' => ['nullable', Rule::in(['generating', 'ready'])],
        ]);

        $certificates = Certificate::query()
            ->with(['student', 'course'])
            ->when($validated['search'] ?? null, function (Builder $query, string $search): void {
                // A support request usually arrives with a name, an email, or the number printed
                // on the certificate — any of them should find it.
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('certificate_number', 'like', "%{$search}%")
                        ->orWhereHas('student', fn (Builder $s) => $s
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($validated['course_id'] ?? null, fn (Builder $query, $courseId) => $query->where('course_id', $courseId))
            ->when($validated['cohort_id'] ?? null, function (Builder $query, $cohortId): void {
                $query->whereExists(fn (QueryBuilder $sub) => $sub
                    ->from('enrolments')
                    ->join('cohort_courses', 'cohort_courses.id', '=', 'enrolments.cohort_course_id')
                    ->whereColumn('enrolments.student_id', 'certificates.student_id')
                    ->whereColumn('enrolments.course_id', 'certificates.course_id')
                    ->where('cohort_courses.cohort_id', $cohortId));
            })
            ->when(($validated['status'] ?? null) === 'generating', fn (Builder $query) => $query->whereNull('certificate_url'))
            ->when(($validated['status'] ?? null) === 'ready', fn (Builder $query) => $query->whereNotNull('certificate_url'))
            ->latest('issued_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        $this->attachCohorts($certificates->getCollection());

        return AdminCertificateResource::collection($certificates);
    }

    /**
     * Re-runs the same idempotent generation path the queued job and the download endpoint use.
     * Safe to press repeatedly: an already-rendered certificate is returned untouched.
     */
    public function regenerate(Certificate $certificate): AdminCertificateResource
    {
        $this->authorize('regenerate', $certificate);

        try {
            $this->certificateService->ensurePdf($certificate);
        } catch (Throwable $e) {
            // This is the failure an admin came here to diagnose, so say what happened instead of
            // a bare 500 — the detail stays in the log.
            logger()->error('Admin certificate regeneration failed', [
                'certificate_id' => $certificate->id,
                'error' => $e->getMessage(),
            ]);

            abort(502, 'The certificate PDF could not be generated. The file store may be unavailable — try again shortly.');
        }

        $certificate->refresh()->load(['student', 'course']);
        $this->attachCohorts(collect([$certificate]));

        return new AdminCertificateResource($certificate);
    }

    /**
     * One query for the whole page rather than one per row. Enrolments are unique per
     * (student, course), so each certificate maps to at most one cohort.
     *
     * @param  \Illuminate\Support\Collection<int, Certificate>  $certificates
     */
    private function attachCohorts($certificates): void
    {
        if ($certificates->isEmpty()) {
            return;
        }

        $enrolments = Enrolment::query()
            ->with('cohortCourse.cohort')
            ->whereIn('student_id', $certificates->pluck('student_id')->unique())
            ->whereIn('course_id', $certificates->pluck('course_id')->unique())
            ->get()
            ->keyBy(fn (Enrolment $enrolment) => "{$enrolment->student_id}:{$enrolment->course_id}");

        foreach ($certificates as $certificate) {
            $enrolment = $enrolments->get("{$certificate->student_id}:{$certificate->course_id}");
            $certificate->setRelation('cohort', $enrolment?->cohortCourse?->cohort);
        }
    }
}
