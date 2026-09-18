<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Certificate;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Storage\MediaStorageService;
use Illuminate\Support\Facades\Storage;

/**
 * A certificate issued to $student for $course, with the student enrolled in a real cohort so the
 * admin list can show and filter by it.
 */
function certificateInCohort(User $student, Course $course, ?string $url = null): array
{
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self, $cohortCourse->id);

    $certificate = Certificate::factory()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'certificate_url' => $url,
    ]);

    return [$certificate, $cohortCourse->cohort];
}

// ── Access control: enforced server-side, not just hidden from the nav ──────────────────────

it('rejects students, instructors and guests from the admin certificate endpoints', function (): void {
    $student = User::factory()->student()->create();
    $instructor = User::factory()->instructor()->create();
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    foreach ([$student, $instructor] as $user) {
        $this->actingAs($user)->getJson('/api/v1/admin/certificates')->assertForbidden();
        $this->actingAs($user)->postJson("/api/v1/admin/certificates/{$certificate->id}/regenerate")->assertForbidden();
    }

    auth()->forgetGuards();
    $this->getJson('/api/v1/admin/certificates')->assertUnauthorized();

    expect($certificate->refresh()->certificate_url)->toBeNull();
});

// ── List ────────────────────────────────────────────────────────────────────────────────────

it('lists every certificate with student, course, cohort and derived status', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['name' => 'Ada Lovelace']);
    $course = Course::factory()->create(['title' => 'Backend Development']);
    [$certificate, $cohort] = certificateInCohort($student, $course, 'certificates/x.pdf');

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/certificates');

    $response->assertOk();
    $response->assertJsonPath('data.0.id', $certificate->id);
    $response->assertJsonPath('data.0.status', 'ready');
    $response->assertJsonPath('data.0.student.name', 'Ada Lovelace');
    $response->assertJsonPath('data.0.course.title', 'Backend Development');
    $response->assertJsonPath('data.0.cohort.id', $cohort->id);
});

it('filters by status, course, cohort and search', function (): void {
    $admin = User::factory()->admin()->create();
    $courseA = Course::factory()->create();
    $courseB = Course::factory()->create();

    [$ready] = certificateInCohort(User::factory()->student()->create(['name' => 'Grace Hopper']), $courseA, 'certificates/a.pdf');
    [$stuck, $stuckCohort] = certificateInCohort(User::factory()->student()->create(['email' => 'stuck@example.test']), $courseB);

    $ids = fn (string $query): array => collect($this->actingAs($admin)->getJson("/api/v1/admin/certificates?{$query}")->json('data'))->pluck('id')->all();

    expect($ids('status=generating'))->toBe([$stuck->id]);
    expect($ids('status=ready'))->toBe([$ready->id]);
    expect($ids("course_id={$courseA->id}"))->toBe([$ready->id]);
    expect($ids("cohort_id={$stuckCohort->id}"))->toBe([$stuck->id]);
    expect($ids('search=Grace'))->toBe([$ready->id]);
    expect($ids('search=stuck@example'))->toBe([$stuck->id]);
    expect($ids('search='.$ready->certificate_number))->toBe([$ready->id]);
});

// ── Download another student's certificate ──────────────────────────────────────────────────

it('lets an admin download a certificate that belongs to another student', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $admin = User::factory()->admin()->create();
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    $response = $this->actingAs($admin)->get("/api/v1/certificates/{$certificate->id}/download");

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toStartWith('https://cdn.test');
});

// ── Regenerate ──────────────────────────────────────────────────────────────────────────────

it('regenerates a stuck certificate through the existing ensurePdf path', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $admin = User::factory()->admin()->create();
    [$certificate] = certificateInCohort(User::factory()->student()->create(), Course::factory()->create());

    $response = $this->actingAs($admin)->postJson("/api/v1/admin/certificates/{$certificate->id}/regenerate");

    $response->assertOk();
    $response->assertJsonPath('data.status', 'ready');
    Storage::disk('r2')->assertExists("certificates/{$certificate->certificate_number}.pdf");
});

it('reports a failed regeneration clearly instead of a bare server error', function (): void {
    $admin = User::factory()->admin()->create();
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    // MediaStorageService is final, so rather than mocking it, make the disk refuse the write the
    // way a misconfigured or unreachable R2 does ('throw' => false returns false). That exercises
    // the real path: putRaw() raising, and the controller turning it into a readable 502.
    $failingDisk = Mockery::mock(Illuminate\Contracts\Filesystem\Filesystem::class);
    $failingDisk->shouldReceive('put')->andReturn(false);
    Storage::set('r2', $failingDisk);

    $response = $this->actingAs($admin)->postJson("/api/v1/admin/certificates/{$certificate->id}/regenerate");

    $response->assertStatus(502);
    expect($response->json('error.message'))->toContain('could not be generated');
    expect($response->json('error.message'))->not->toContain('Failed to store generated file');
    expect($certificate->refresh()->certificate_url)->toBeNull();
});

// ── Public verification ─────────────────────────────────────────────────────────────────────

it('verifies a genuine certificate without login and exposes only what verification needs', function (): void {
    $student = User::factory()->student()->create([
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.test',
        'phone' => '08012345678',
    ]);
    $course = Course::factory()->create(['title' => 'Backend Development']);
    $certificate = Certificate::factory()->create(['student_id' => $student->id, 'course_id' => $course->id]);

    $response = $this->getJson("/api/v1/certificates/verify/{$certificate->certificate_number}");

    $response->assertOk();
    expect(array_keys($response->json('data')))->toEqualCanonicalizing([
        'valid', 'certificate_number', 'student_name', 'course_title', 'issued_at',
    ]);
    $response->assertJsonPath('data.valid', true);
    $response->assertJsonPath('data.student_name', 'Ada Lovelace');
    $response->assertJsonPath('data.course_title', 'Backend Development');

    $raw = $response->getContent();
    expect($raw)->not->toContain('ada@example.test');
    expect($raw)->not->toContain('08012345678');
});

it('answers an unknown number with a plain not-found message, not framework internals', function (): void {
    $response = $this->getJson('/api/v1/certificates/verify/CERT-DOESNOTEXIST');

    $response->assertNotFound();
    expect($response->json('error.message'))->toContain('No certificate was found');
    expect($response->getContent())->not->toContain('App\\\\Models');
});

it('verifies a certificate whose PDF is still generating, since the award itself is real', function (): void {
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    $response = $this->getJson("/api/v1/certificates/verify/{$certificate->certificate_number}");

    $response->assertOk();
    $response->assertJsonPath('data.valid', true);
    expect($response->getContent())->not->toContain('certificate_url');
});
