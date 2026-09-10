<?php

declare(strict_types=1);

use App\Enums\EnrolmentStatus;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Mail\EnrolmentConfirmed;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;

it('auto-confirms every course application with no rejection path', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ]);

    $response->assertCreated();
    expect(Enrolment::first()->status)->toBe(EnrolmentStatus::Confirmed);
});

it('sets the confirmation email delay from the course, not a hardcoded value', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['confirmation_delay_hours' => 72]);
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $this->actingAs($student)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ])->assertCreated();

    $enrolment = Enrolment::first();
    $expectedDueAt = $enrolment->applied_at->clone()->addHours(72);

    expect($enrolment->confirmation_email_due_at->equalTo($expectedDueAt))->toBeTrue();
});

it('creates a pending order alongside the enrolment', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['price' => 50000]);
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $this->actingAs($student)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ])->assertCreated();

    $this->assertDatabaseHas('orders', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'pending',
        'amount' => 50000,
    ]);
});

it('rejects enrolling in the same cohort offering twice with a clean validation error, not a raw DB crash', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $this->actingAs($student)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ])->assertCreated();

    $response = $this->actingAs($student)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonPath('error.code', 'validation_failed');
    expect(array_keys($response->json('error.fields')))->toContain('cohort_course_id');
    expect(Enrolment::query()->where('student_id', $student->id)->count())->toBe(1);
});

it('denies instructors from self-enrolling as a student', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $cohortCourse = CohortCourse::factory()->for($course)->open()->create();

    $response = $this->actingAs($instructor)->postJson('/api/v1/enrolments', [
        'course_id' => $course->id,
        'cohort_course_id' => $cohortCourse->id,
    ]);

    $response->assertForbidden();
});

it('does not double-send the confirmation email if the job runs twice', function (): void {
    Mail::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $enrolment = Enrolment::factory()->for($student, 'student')->for($course, 'course')->create();

    (new SendEnrolmentConfirmationEmail($enrolment->id))->handle();
    (new SendEnrolmentConfirmationEmail($enrolment->id))->handle();

    Mail::assertSent(EnrolmentConfirmed::class, 1);
});
