<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Jobs\GenerateCertificatePdf;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CohortCourse;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Notification;
use App\Models\Resource;
use App\Models\User;
use App\Services\Certification\CertificateService;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Bus::fake();
});

it('issues a certificate when the last module in a course completes', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, CohortCourse::factory()->for($course)->open()->create()->id);
    app(ProgressEngine::class)->markRead($student, $resource);

    $certificate = Certificate::where('student_id', $student->id)->where('course_id', $course->id)->first();

    expect($certificate)->not->toBeNull();
    expect($certificate->certificate_number)->toStartWith('CERT-');

    Bus::assertDispatched(GenerateCertificatePdf::class, fn ($job) => $job->certificateId === $certificate->id);
    expect(Notification::where('user_id', $student->id)->where('type', 'certificate_issued')->exists())->toBeTrue();
});

it('does not issue a certificate while a later module is still incomplete', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $first = Module::factory()->for($course)->create(['order_index' => 1]);
    $firstResource = Resource::factory()->for($first)->reading()->create();
    ModuleItem::create(['module_id' => $first->id, 'item_type' => 'resource', 'item_id' => $firstResource->id, 'order_index' => 1, 'is_required' => true]);

    $second = Module::factory()->for($course)->create(['order_index' => 2]);
    $secondResource = Resource::factory()->for($second)->reading()->create();
    ModuleItem::create(['module_id' => $second->id, 'item_type' => 'resource', 'item_id' => $secondResource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, CohortCourse::factory()->for($course)->open()->create()->id);
    app(ProgressEngine::class)->markRead($student, $firstResource);

    expect(Certificate::where('student_id', $student->id)->where('course_id', $course->id)->exists())->toBeFalse();
});

it('issues a certificate exactly once per student per course, even if triggered twice', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    app(CertificateService::class)->issueForCourseCompletion($student, $course);
    app(CertificateService::class)->issueForCourseCompletion($student, $course);

    expect(Certificate::where('student_id', $student->id)->where('course_id', $course->id)->count())->toBe(1);
    Bus::assertDispatchedTimes(GenerateCertificatePdf::class, 1);
});

/**
 * The queued job only runs when a worker is running. Without this endpoint rendering on demand,
 * a student on an install with no worker sees "Certificate generating…" forever — the bug this
 * covers.
 */
it('renders the certificate PDF on demand when the queued job has not run yet', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);

    $certificate = Certificate::factory()->create(['certificate_url' => null]);
    $student = $certificate->student;

    $response = $this->actingAs($student)->get("/api/v1/certificates/{$certificate->id}/download");

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toStartWith('https://cdn.test');

    $certificate->refresh();
    expect($certificate->certificate_url)->toBe("certificates/{$certificate->certificate_number}.pdf");
    Storage::disk('r2')->assertExists($certificate->certificate_url);
});

it('serves an already-generated certificate without re-rendering it', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);

    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    $this->actingAs($certificate->student)->get("/api/v1/certificates/{$certificate->id}/download")->assertRedirect();
    $certificate->refresh();
    $firstBytes = Storage::disk('r2')->get($certificate->certificate_url);

    $this->actingAs($certificate->student)->get("/api/v1/certificates/{$certificate->id}/download")->assertRedirect();

    expect(Storage::disk('r2')->get($certificate->certificate_url))->toBe($firstBytes);
});

it('does not let one student download another student\'s certificate', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);

    $certificate = Certificate::factory()->create(['certificate_url' => null]);
    $someoneElse = User::factory()->student()->create();

    $this->actingAs($someoneElse)->get("/api/v1/certificates/{$certificate->id}/download")->assertForbidden();

    expect($certificate->refresh()->certificate_url)->toBeNull();
});

it('stores the generated certificate PDF on R2 as a path, and the API resolves it to a full URL', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);

    $admin = User::factory()->admin()->create();
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    // Not ::dispatchSync() — this file's beforeEach() fakes the Bus for every test here (the
    // other tests assert against dispatch, not execution), and Bus::fake() intercepts
    // dispatchSync() too. app()->call() invokes handle() directly with real DI, bypassing the
    // fake entirely so the job's real R2-storage logic actually runs.
    app()->call([new GenerateCertificatePdf($certificate->id), 'handle']);
    $certificate->refresh();

    // The DB column holds a relative R2 path, not a full URL — the one pre-existing
    // inconsistency this migration fixes (every other upload already stored a path).
    expect($certificate->certificate_url)->toBe("certificates/{$certificate->certificate_number}.pdf");
    Storage::disk('r2')->assertExists($certificate->certificate_url);

    $response = $this->actingAs($admin)->getJson("/api/v1/certificates/{$certificate->id}");

    $response->assertOk();
    expect($response->json('data.certificate_url'))->toStartWith('http');
    expect($response->json('data.certificate_url'))->not->toBe($certificate->certificate_url);
});
