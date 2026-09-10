<?php

declare(strict_types=1);

use App\Enums\CourseEnrolmentPolicy;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;

it('rejects a section that belongs to a different course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $foreignSection = CohortCourse::factory()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'cohort_course_id' => $foreignSection->id,
        'answers' => [],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['cohort_course_id'], responseKey: 'error.fields');
    $this->assertDatabaseMissing('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
    ]);
});

it('accepts a section that belongs to the applied course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['enrolment_policy' => CourseEnrolmentPolicy::Application]);
    $section = CohortCourse::factory()->for($course)->open()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'cohort_course_id' => $section->id,
        'answers' => [],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('course_applications', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'cohort_course_id' => $section->id,
    ]);
});

it('rejects an application whose answers count does not match the course questions', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => [
            ['text' => 'Why this course?', 'correct_answer' => true],
            ['text' => 'What have you built before?', 'correct_answer' => true],
        ],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'answers' => [true],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['answers'], responseKey: 'error.fields');
});

it('rejects an application that omits answers entirely', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => [['text' => 'Why this course?', 'correct_answer' => true]],
    ]);

    $response = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['answers'], responseKey: 'error.fields');
});

it('rejects a non-boolean answer', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create([
        'enrolment_policy' => CourseEnrolmentPolicy::Application,
        'application_questions' => [['text' => 'Why this course?', 'correct_answer' => true]],
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
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $missing = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
        'answers' => [],
    ]);

    $missing->assertUnprocessable();
    $missing->assertJsonValidationErrors(['portfolio_url'], responseKey: 'error.fields');

    $provided = $this->actingAs($student)->postJson('/api/v1/course-applications', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
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
