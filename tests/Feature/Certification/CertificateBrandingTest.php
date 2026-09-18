<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Certificate;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;
use App\Services\Certification\CertificateArtwork;
use App\Services\Certification\CertificatePrintData;
use App\Services\Enrolment\EnrolmentService;

function printDataFor(Certificate $certificate): array
{
    return app(CertificatePrintData::class)->for($certificate);
}

/** The decoded SVG behind a `data:image/svg+xml;base64,…` URI. */
function decodeSvg(string $dataUri): string
{
    expect($dataUri)->toStartWith('data:image/svg+xml;base64,');

    return base64_decode(substr($dataUri, strlen('data:image/svg+xml;base64,')), true);
}

// ── What the certificate says ───────────────────────────────────────────────────────────────

it('prints the issuing institution, the verification URL and the cohort the course ran in', function (): void {
    config([
        'certificates.institution' => 'Resnet Academy',
        'certificates.website' => 'https://resnet.example/',
    ]);

    $student = User::factory()->student()->create(['name' => 'Ada Lovelace']);
    $instructor = User::factory()->instructor()->create(['name' => 'Grace Hopper']);
    $course = Course::factory()->create(['title' => 'Backend Development']);

    $cohort = Cohort::factory()->create(['start_date' => '2026-08-03', 'end_date' => '2026-09-25']);
    $cohortCourse = CohortCourse::factory()->for($course)->for($cohort)->open()->create([
        'primary_instructor_id' => $instructor->id,
    ]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

    $certificate = Certificate::factory()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'certificate_number' => 'CERT-ABCDEFGH1234',
    ]);

    $data = printDataFor($certificate);

    expect($data['institution'])->toBe('Resnet Academy')
        // Printed on the certificate and encoded in its QR code, so it must survive unchanged.
        ->and($data['verificationUrl'])->toBe('https://resnet.example/verify-certificate?number=CERT-ABCDEFGH1234')
        ->and($data['website'])->toBe('resnet.example')
        // Distinct from the "Issued" date: when the course actually ran.
        ->and($data['studyPeriod'])->toBe('Aug – Sep 2026')
        ->and($data['signatoryName'])->toBe('Grace Hopper')
        ->and($data['signatoryTitle'])->toBe('Course Instructor');
});

it('signs for the institution and omits the period when the course was not taken in a cohort', function (): void {
    config([
        'certificates.signatory.name' => 'Resnet Academy',
        'certificates.signatory.title' => 'Programme Director',
    ]);

    $certificate = Certificate::factory()->create();

    $data = printDataFor($certificate);

    expect($data['studyPeriod'])->toBeNull()
        ->and($data['signatoryName'])->toBe('Resnet Academy')
        ->and($data['signatoryTitle'])->toBe('Programme Director');
});

it('collapses the study period to a single label when a cohort starts and ends in one month', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $cohort = Cohort::factory()->create(['start_date' => '2026-09-01', 'end_date' => '2026-09-30']);
    $cohortCourse = CohortCourse::factory()->for($course)->for($cohort)->open()->create();
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

    $certificate = Certificate::factory()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
    ]);

    expect(printDataFor($certificate)['studyPeriod'])->toBe('Sep 2026');
});

// ── The artwork ─────────────────────────────────────────────────────────────────────────────

it('draws the QR code as plain SVG rectangles php-svg-lib can render', function (): void {
    $svg = decodeSvg(app(CertificateArtwork::class)->qrCode('https://resnet.example/verify-certificate?number=CERT-1'));

    // BaconQrCode's own SVG writer emits <use>/<defs>, which dompdf's SVG renderer ignores —
    // the code would come out blank on the certificate.
    expect($svg)->not->toContain('<use')
        ->and($svg)->not->toContain('<defs')
        ->and(substr_count($svg, '<rect'))->toBeGreaterThan(100);
});

it('draws the logo and signature as strokes rather than filled silhouettes', function (): void {
    $artwork = app(CertificateArtwork::class);

    // php-svg-lib does not inherit presentation attributes from the root <svg>, so every path
    // carries its own fill="none". Without it the graduation cap prints as a solid blob.
    foreach ([$artwork->logo(), $artwork->signature(), $artwork->watermark()] as $dataUri) {
        $svg = decodeSvg($dataUri);
        $paths = substr_count($svg, '<path');

        expect($paths)->toBeGreaterThan(0)
            ->and(substr_count($svg, '<path fill="none"'))->toBe($paths);
    }
});

// ── The rendered document ───────────────────────────────────────────────────────────────────

it('renders every branding and trust element into the certificate template', function (): void {
    $certificate = Certificate::factory()->create(['certificate_number' => 'CERT-RENDERME1234']);
    $data = printDataFor($certificate);

    $html = view('certificates.pdf', $data)->render();

    expect($html)
        ->toContain($data['institution'])
        ->toContain($data['verificationUrl'])
        ->toContain('Scan to verify')
        ->toContain($data['qrCode'])
        ->toContain($data['logo'])
        ->toContain($data['seal'])
        ->toContain($data['signature'])
        ->toContain($data['watermark'])
        ->toContain($data['signatoryName'])
        // The watermark must paint before the text; see the note in the template.
        ->toContain('z-index: -1');
});

it('produces a readable PDF for the longest names a course and student can have', function (): void {
    $student = User::factory()->student()->create([
        'name' => 'Maximiliana Oluwaseunfunmilayo Abrahamovich-Fitzwilliams',
    ]);
    $course = Course::factory()->create([
        'title' => 'Advanced Distributed Backend Systems Engineering with Laravel, Queues and Event-Driven Architecture',
    ]);
    $certificate = Certificate::factory()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
    ]);

    $pdf = Barryvdh\DomPDF\Facade\Pdf::loadView('certificates.pdf', printDataFor($certificate))->output();

    // A second page would mean the signature block and footer fell off the certificate.
    // "/Type /Page" also matches the "/Type /Pages" tree node, so discount that one.
    $pages = substr_count($pdf, '/Type /Page') - substr_count($pdf, '/Type /Pages');

    expect(substr($pdf, 0, 5))->toBe('%PDF-')
        ->and($pages)->toBe(1);
});
