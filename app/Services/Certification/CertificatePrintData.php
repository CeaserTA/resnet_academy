<?php

declare(strict_types=1);

namespace App\Services\Certification;

use App\Models\Certificate;
use App\Models\Cohort;
use App\Models\Enrolment;

/**
 * Assembles everything the certificate template prints — names, dates, branding and artwork —
 * so the Blade view stays free of queries and CertificateService stays about rendering and
 * storage.
 */
final class CertificatePrintData
{
    public function __construct(private readonly CertificateArtwork $artwork) {}

    /**
     * @return array<string, string|null>
     */
    public function for(Certificate $certificate): array
    {
        $certificate->loadMissing(['student', 'course']);

        // The cohort the student sat the course in carries both the study period and the
        // instructor who signs the certificate.
        $cohortCourse = Enrolment::query()
            ->where('student_id', $certificate->student_id)
            ->where('course_id', $certificate->course_id)
            ->with(['cohortCourse.cohort', 'cohortCourse.primaryInstructor'])
            ->first()
            ?->cohortCourse;

        $cohort = $cohortCourse?->cohort;
        $instructor = $cohortCourse?->primaryInstructor;
        $verificationUrl = $this->verificationUrl($certificate);

        return [
            'studentName' => $certificate->student->name,
            'courseTitle' => $certificate->course->title,
            'certificateNumber' => $certificate->certificate_number,
            'issuedAt' => $certificate->issued_at->toFormattedDateString(),
            'institution' => (string) config('certificates.institution'),
            'website' => $this->displayHost((string) config('certificates.website')),
            'verificationUrl' => $verificationUrl,
            // Null when the course wasn't taken as part of a scheduled cohort, in which case the
            // template omits the line rather than guessing at a study period.
            'studyPeriod' => $cohort === null ? null : $this->studyPeriod($cohort),
            'signatoryName' => $instructor?->name ?? (string) config('certificates.signatory.name'),
            'signatoryTitle' => $instructor === null
                ? (string) config('certificates.signatory.title')
                : 'Course Instructor',
            'logo' => $this->artwork->logo(),
            'watermark' => $this->artwork->watermark(),
            'qrCode' => $this->artwork->qrCode($verificationUrl),
            'signature' => $this->artwork->signature(),
            'seal' => $this->artwork->seal(),
        ];
    }

    /**
     * The URL printed in the footer and encoded in the QR code. `/verify-certificate?number=…`
     * opens the site's verification modal with the number already filled in and looked up, so
     * scanning a printed certificate lands straight on the result without anyone typing it.
     */
    public function verificationUrl(Certificate $certificate): string
    {
        return rtrim((string) config('certificates.website'), '/')
            .'/verify-certificate?number='.urlencode($certificate->certificate_number);
    }

    /** "Aug – Sep 2026", collapsed to one label when the cohort starts and ends in the same month. */
    private function studyPeriod(Cohort $cohort): ?string
    {
        $start = $cohort->start_date;
        $end = $cohort->end_date;

        if ($start === null || $end === null) {
            return null;
        }

        if ($start->isSameMonth($end)) {
            return $start->format('M Y');
        }

        return $start->isSameYear($end)
            ? $start->format('M').' – '.$end->format('M Y')
            : $start->format('M Y').' – '.$end->format('M Y');
    }

    /** Certificates are printed, so the footer shows a readable host rather than a full URL. */
    private function displayHost(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        if ($host === null || $host === false) {
            return $url;
        }

        // Keeps a non-default port, so the printed address still resolves outside production.
        $port = parse_url($url, PHP_URL_PORT);

        return $port === null ? $host : $host.':'.$port;
    }
}
