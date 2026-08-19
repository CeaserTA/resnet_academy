<?php

declare(strict_types=1);

use App\Enums\CourseEnrolmentPolicy;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\User;

it('rejects a section that belongs to a different course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $foreignSection = CourseSection::factory()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'section_id' => $foreignSection->id,
        'answers' => [],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['section_id'], responseKey: 'error.fields');
    $this->assertDatabaseMissing('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
    ]);
});

it('accepts a section that belongs to the applied course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $section = CourseSection::factory()->for($course)->open()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'section_id' => $section->id,
        'answers' => [],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'section_id' => $section->id,
    ]);
});

it('rejects an application whose answers count does not match the course questions', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => ['Why this course?', 'What have you built before?'],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => ['Only one answer for two questions.'],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['answers'], responseKey: 'error.fields');
});

it('rejects an application that omits answers entirely', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => ['Why this course?'],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['answers'], responseKey: 'error.fields');
});

it('rejects empty-string answers', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => ['Why this course?'],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => [''],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['answers.0'], responseKey: 'error.fields');
});

it('requires portfolio_url when the course requires it and accepts it when provided', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_require_portfolio_url' => true,
    ]);

    $missing = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => [],
    ]);

    $missing->assertUnprocessable();
    $missing->assertJsonValidationErrors(['portfolio_url'], responseKey: 'error.fields');

    $provided = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => [],
        'portfolio_url' => 'https://example.com/portfolio',
    ]);

    $provided->assertCreated();
});

it('still returns the profile_incomplete envelope for callers bypassing the frontend gate', function (): void {
    $student = User::factory()->student()->incompleteProfile()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => [],
    ]);

    $response->assertForbidden();
    $response->assertJsonPath('error.code', 'profile_incomplete');
    expect($response->json('error.missing_fields'))
        ->toContain('phone', 'country', 'city', 'highest_qualification');
});
