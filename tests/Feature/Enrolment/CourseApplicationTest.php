<?php

declare(strict_types=1);

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseSectionStatus;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

it('rejects a direct enrolment attempt on an Application-policy course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);

    $response = $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id]);

    $response->assertUnprocessable();
    expect(Enrolment::query()->count())->toBe(0);
});

it('still allows direct enrolment for Open and Advisory courses', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $open = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Open]);
    $advisory = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Advisory]);

    $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $open->id])->assertCreated();
    $this->actingAs(User::factory()->student()->create())
        ->postJson('/api/v1/enrolments', ['course_id' => $advisory->id])
        ->assertCreated();
});

it('submits an application for an Application-policy course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => ['Why do you want to take this course?'],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => ['Because I want to level up.'],
        'portfolio_url' => 'https://example.com/portfolio',
        'alternative_proof_text' => 'I built a side project.',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'pending',
    ]);
});

it('rejects an application for a non-Application-policy course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Open]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', ['course_id' => $course->id]);

    $response->assertUnprocessable();
});

it('rejects a duplicate pending application to the same course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);

    $this->actingAs($student)->postJson('/api/v1/course-applications', ['course_id' => $course->id])->assertCreated();
    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', ['course_id' => $course->id]);

    $response->assertUnprocessable();
});

it('rejects a section that belongs to a different course than the application', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $otherCourse = Course::factory()->create();
    $foreignSection = CourseSection::factory()->create([
        'course_id' => $otherCourse->id,
        'status' => CourseSectionStatus::Open,
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'section_id' => $foreignSection->id,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonPath('error.code', 'validation_failed');
    expect(array_keys($response->json('error.fields')))->toContain('section_id');
    $this->assertDatabaseMissing('course_applications', ['student_id' => $student->id]);
});

it('requires a portfolio URL when the course demands one', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_require_portfolio_url' => true,
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonPath('error.code', 'validation_failed');
    expect(array_keys($response->json('error.fields')))->toContain('portfolio_url');

    // With the portfolio supplied the same application goes through
    $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'portfolio_url' => 'https://example.com/portfolio',
    ])->assertCreated();
});

it('does not require a portfolio URL when the course does not demand one', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_require_portfolio_url' => false,
    ]);

    $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ])->assertCreated();
});

it('paginates the review queue, filters by status, and batch-loads recommended courses', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $recommendedCourse = Course::factory()->create();

    $pending = CourseApplication::factory()->for($course, 'course')->create([
        'status' => CourseApplicationStatus::Pending,
    ]);
    $rejected = CourseApplication::factory()->for($course, 'course')->create([
        'status' => CourseApplicationStatus::Rejected,
        'recommended_course_ids' => [$recommendedCourse->id],
        'rejection_reason' => 'Not ready yet.',
    ]);

    $all = $this->actingAs($admin)->getJson('/api/v1/course-applications');
    $all->assertOk();
    $all->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'per_page', 'total']]);
    expect(collect($all->json('data'))->pluck('id'))->toContain($pending->id, $rejected->id);
    expect($all->json('meta.per_page'))->toBe(25);

    // Status filter narrows the queue server-side
    $onlyRejected = $this->actingAs($admin)->getJson('/api/v1/course-applications?status=rejected');
    expect(collect($onlyRejected->json('data'))->pluck('id'))->toEqual(collect([$rejected->id]));

    // Recommended courses render from the batch load, not a per-row query
    $row = collect($onlyRejected->json('data'))->firstWhere('id', $rejected->id);
    expect(collect($row['recommended_courses'])->pluck('id'))->toEqual(collect([$recommendedCourse->id]));
});

it('approving an application creates a real confirmed enrolment via the existing enrolment pipeline', function (): void {
    Bus::fake();
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application, 'price' => 20000]);
    $application = CourseApplication::factory()->for($student, 'student')->for($course, 'course')->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/course-applications/{$application->id}/approve");

    $response->assertOk();
    expect($application->fresh()->status)->toBe(CourseApplicationStatus::Approved);
    $this->assertDatabaseHas('enrolments', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'confirmed',
    ]);
    $this->assertDatabaseHas('orders', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'amount' => 20000,
    ]);
});

it('rejecting an application stores recommended courses, a reason, and never touches enrolments', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $beginnerCourse = Course::factory()->create();
    $application = CourseApplication::factory()->for($student, 'student')->for($course, 'course')->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/course-applications/{$application->id}/reject", [
        'recommended_course_ids' => [$beginnerCourse->id],
        'rejection_reason' => 'This course requires prior experience in web fundamentals.',
    ]);

    $response->assertOk();
    $response->assertJsonPath('data.rejection_reason', 'This course requires prior experience in web fundamentals.');
    expect($application->fresh()->status)->toBe(CourseApplicationStatus::Rejected);
    expect($application->fresh()->recommended_course_ids)->toBe([$beginnerCourse->id]);
    expect($application->fresh()->rejection_reason)->toBe('This course requires prior experience in web fundamentals.');
    $this->assertDatabaseMissing('enrolments', ['student_id' => $student->id, 'course_id' => $course->id]);
});

it('denies non-admins from approving or rejecting applications', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $application = CourseApplication::factory()->for($student, 'student')->for($course, 'course')->create();

    $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/approve")->assertForbidden();
    $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/reject")->assertForbidden();
});

it('lets an instructor teaching the course approve and reject applications for it', function (): void {
    Bus::fake();
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $approved = CourseApplication::factory()->for($course, 'course')->create();
    $this->actingAs($instructor)->postJson("/api/v1/course-applications/{$approved->id}/approve")->assertOk();
    expect($approved->fresh()->status)->toBe(CourseApplicationStatus::Approved);
    expect($approved->fresh()->reviewed_by)->toBe($instructor->id);

    $rejected = CourseApplication::factory()->for($course, 'course')->create();
    $this->actingAs($instructor)->postJson("/api/v1/course-applications/{$rejected->id}/reject")->assertOk();
    expect($rejected->fresh()->status)->toBe(CourseApplicationStatus::Rejected);
});

it('denies an instructor from deciding an application for a course they do not teach', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $application = CourseApplication::factory()->for($course, 'course')->create();

    $this->actingAs($instructor)->postJson("/api/v1/course-applications/{$application->id}/approve")->assertForbidden();
    $this->actingAs($instructor)->postJson("/api/v1/course-applications/{$application->id}/reject")->assertForbidden();
});

it('scopes the review queue to an instructor\'s own courses, but shows everything to an admin', function (): void {
    $instructor = User::factory()->instructor()->create();
    $ownCourse = Course::factory()->create();
    $otherCourse = Course::factory()->create();
    $ownCourse->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $ownApplication = CourseApplication::factory()->for($ownCourse, 'course')->create();
    $otherApplication = CourseApplication::factory()->for($otherCourse, 'course')->create();

    $instructorIds = collect($this->actingAs($instructor)->getJson('/api/v1/course-applications')->json('data'))->pluck('id');
    expect($instructorIds)->toEqual(collect([$ownApplication->id]));

    $admin = User::factory()->admin()->create();
    $adminIds = collect($this->actingAs($admin)->getJson('/api/v1/course-applications')->json('data'))->pluck('id');
    expect($adminIds)->toContain($ownApplication->id, $otherApplication->id);
});

it('blocks deciding an application that has already been decided', function (): void {
    Bus::fake();
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $application = CourseApplication::factory()->approved()->for($course, 'course')->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/course-applications/{$application->id}/approve");

    $response->assertUnprocessable();
});

it('excludes a rejected application from the dashboard once it is older than the visibility window', function (): void {
    $student = User::factory()->student()->create();

    $recent = CourseApplication::factory()->rejected()->for($student, 'student')->create(['reviewed_at' => now()->subDays(13)]);
    $expired = CourseApplication::factory()->rejected()->for($student, 'student')->create(['reviewed_at' => now()->subDays(15)]);

    $ids = collect($this->actingAs($student)->getJson('/api/v1/course-applications/me')->json('data'))->pluck('id');

    expect($ids)->toContain($recent->id)->not->toContain($expired->id);
});

it('excludes a dismissed rejected application from the dashboard regardless of age', function (): void {
    $student = User::factory()->student()->create();
    $dismissed = CourseApplication::factory()->rejected()->for($student, 'student')->create([
        'reviewed_at' => now()->subDay(),
        'dismissed_at' => now(),
    ]);

    $ids = collect($this->actingAs($student)->getJson('/api/v1/course-applications/me')->json('data'))->pluck('id');

    expect($ids)->not->toContain($dismissed->id);
});

it('excludes a rejected application once the student has enrolled in a recommended course', function (): void {
    $student = User::factory()->student()->create();
    $recommendedCourse = Course::factory()->create();
    $application = CourseApplication::factory()->rejected()->for($student, 'student')->create([
        'reviewed_at' => now(),
        'recommended_course_ids' => [$recommendedCourse->id],
    ]);
    Enrolment::factory()->for($student, 'student')->for($recommendedCourse, 'course')->create();

    $ids = collect($this->actingAs($student)->getJson('/api/v1/course-applications/me')->json('data'))->pluck('id');

    expect($ids)->not->toContain($application->id);
});

it('always includes a pending application on the dashboard regardless of age', function (): void {
    $student = User::factory()->student()->create();
    $pending = CourseApplication::factory()->for($student, 'student')->create(['created_at' => now()->subDays(30)]);

    $ids = collect($this->actingAs($student)->getJson('/api/v1/course-applications/me')->json('data'))->pluck('id');

    expect($ids)->toContain($pending->id);
});

it('lets a student dismiss their own rejected application', function (): void {
    $student = User::factory()->student()->create();
    $application = CourseApplication::factory()->rejected()->for($student, 'student')->create();

    $response = $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/dismiss");

    $response->assertOk();
    expect($application->fresh()->dismissed_at)->not->toBeNull();
});

it('denies dismissing a pending application', function (): void {
    $student = User::factory()->student()->create();
    $application = CourseApplication::factory()->for($student, 'student')->create();

    $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/dismiss")->assertForbidden();
});

it('denies dismissing another student\'s application', function (): void {
    $owner = User::factory()->student()->create();
    $other = User::factory()->student()->create();
    $application = CourseApplication::factory()->rejected()->for($owner, 'student')->create();

    $this->actingAs($other)->postJson("/api/v1/course-applications/{$application->id}/dismiss")->assertForbidden();
});

// Progressive Student Profile Completion - Middleware Integration Tests (Task 8.2)
it('blocks course application submission when profile is incomplete', function (): void {
    $student = User::factory()->student()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => null, // Missing required field
        'country' => null, // Missing required field
        'city' => null, // Missing required field
        'highest_qualification' => null, // Missing required field
    ]);
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ]);

    $response->assertForbidden();
    $response->assertJson([
        'error' => [
            'code' => 'profile_incomplete',
            'message' => 'Please complete your profile before applying for this course.',
            'missing_fields' => ['phone', 'country', 'city', 'highest_qualification'],
        ],
    ]);
    $this->assertDatabaseMissing('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
    ]);
});

it('allows course application submission when profile is complete', function (): void {
    $student = User::factory()->student()->create([
        'name' => 'Jane Smith',
        'email' => 'jane@example.com',
        'phone' => '+1234567890',
        'country' => 'United States',
        'city' => 'New York',
        'highest_qualification' => 'Bachelor\'s Degree',
    ]);
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => ['Why do you want to take this course?'],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => ['I want to advance my career.'],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'pending',
    ]);
});

it('provides detailed missing fields in error response for incomplete profile', function (): void {
    $student = User::factory()->student()->create([
        'name' => 'Bob Johnson',
        'email' => 'bob@example.com',
        'phone' => '+1234567890',
        'country' => 'Canada',
        'city' => null, // Missing
        'highest_qualification' => null, // Missing
    ]);
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ]);

    $response->assertForbidden();
    $missingFields = $response->json('error.missing_fields');
    expect($missingFields)->toBe(['city', 'highest_qualification']);
    expect($missingFields)->not->toContain('phone', 'country', 'name', 'email');
});
