<?php

declare(strict_types=1);

use App\Enums\EnrolmentStatus;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Mail\EnrolmentConfirmed;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;

it('auto-confirms every course application with no rejection path', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id]);

    $response->assertCreated();
    expect(Enrolment::first()->status)->toBe(EnrolmentStatus::Confirmed);
});

it('sets the confirmation email delay from the course, not a hardcoded value', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['confirmation_delay_hours' => 72]);

    $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id])->assertCreated();

    $enrolment = Enrolment::first();
    $expectedDueAt = $enrolment->applied_at->clone()->addHours(72);

    expect($enrolment->confirmation_email_due_at->equalTo($expectedDueAt))->toBeTrue();
});

it('creates a pending order alongside the enrolment', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['price' => 50000]);

    $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id])->assertCreated();

    $this->assertDatabaseHas('orders', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'pending',
        'amount' => 50000,
    ]);
});

it('rejects enrolling in the same course twice', function (): void {
    Bus::fake();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id])->assertCreated();
    $response = $this->actingAs($student)->postJson('/api/v1/enrolments', ['course_id' => $course->id]);

    $response->assertUnprocessable();
});

it('denies instructors from self-enrolling as a student', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($instructor)->postJson('/api/v1/enrolments', ['course_id' => $course->id]);

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
