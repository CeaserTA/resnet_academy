<?php

declare(strict_types=1);

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Models\Course;
use App\Models\CourseApplication;
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

it('rejecting an application stores recommended courses and never touches enrolments', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $beginnerCourse = Course::factory()->create();
    $application = CourseApplication::factory()->for($student, 'student')->for($course, 'course')->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/course-applications/{$application->id}/reject", [
        'recommended_course_ids' => [$beginnerCourse->id],
    ]);

    $response->assertOk();
    expect($application->fresh()->status)->toBe(CourseApplicationStatus::Rejected);
    expect($application->fresh()->recommended_course_ids)->toBe([$beginnerCourse->id]);
    $this->assertDatabaseMissing('enrolments', ['student_id' => $student->id, 'course_id' => $course->id]);
});

it('denies non-admins from approving or rejecting applications', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $application = CourseApplication::factory()->for($student, 'student')->for($course, 'course')->create();

    $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/approve")->assertForbidden();
    $this->actingAs($student)->postJson("/api/v1/course-applications/{$application->id}/reject")->assertForbidden();
});
