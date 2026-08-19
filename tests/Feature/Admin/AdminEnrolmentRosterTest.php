<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('lists enrolments for an admin with student, course and section details', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['title' => 'Advanced Laravel']);
    $section = CourseSection::factory()->for($course)->create(['name' => 'Cohort 3']);
    $student = User::factory()->student()->create(['name' => 'Alice Wonder', 'email' => 'alice@example.com']);
    Enrolment::factory()->for($student, 'student')->for($course)->for($section, 'section')->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments');

    $response->assertOk();
    $response->assertJsonPath('data.0.student.name', 'Alice Wonder');
    $response->assertJsonPath('data.0.student.email', 'alice@example.com');
    $response->assertJsonPath('data.0.course.title', 'Advanced Laravel');
    $response->assertJsonPath('data.0.section.name', 'Cohort 3');
    $response->assertJsonPath('data.0.status', 'confirmed');
    $response->assertJsonPath('data.0.source', 'self');
    // PHP's json_encode drops the trailing .0 on whole floats, so this decodes as an int.
    expect((float) $response->json('data.0.progress_percent'))->toBe(0.0);
    expect($response->json('data.0.applied_at'))->not->toBeNull();
});

it('scopes the roster to an instructor\'s own courses but denies students', function (): void {
    $instructor = User::factory()->instructor()->create();
    $ownCourse = Course::factory()->create();
    $otherCourse = Course::factory()->create();
    $ownCourse->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $ownEnrolment = Enrolment::factory()->for($ownCourse)->create();
    $otherEnrolment = Enrolment::factory()->for($otherCourse)->create();

    $ids = collect($this->actingAs($instructor)->getJson('/api/v1/admin/enrolments')->json('data'))->pluck('id');
    expect($ids)->toEqual(collect([$ownEnrolment->id]))
        ->not->toContain($otherEnrolment->id);

    $student = User::factory()->student()->create();
    $this->actingAs($student)->getJson('/api/v1/admin/enrolments')->assertForbidden();
});

it('filters the roster by course, status, source and search', function (): void {
    $admin = User::factory()->admin()->create();
    $courseA = Course::factory()->create();
    $courseB = Course::factory()->create();

    $match = User::factory()->student()->create(['name' => 'Grace Hopper', 'email' => 'grace@navy.mil']);
    Enrolment::factory()->for($match, 'student')->for($courseA)->create([
        'status' => EnrolmentStatus::Waitlisted,
        'source' => EnrolmentSource::AdminBulk,
    ]);
    Enrolment::factory()->for($courseA)->create(); // confirmed self
    Enrolment::factory()->for($courseB)->create();

    $byCourse = $this->actingAs($admin)->getJson("/api/v1/admin/enrolments?course_id={$courseA->id}");
    expect($byCourse->json('data'))->toHaveCount(2);

    $byStatus = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments?status=waitlisted');
    expect($byStatus->json('data'))->toHaveCount(1);
    expect($byStatus->json('data.0.status'))->toBe('waitlisted');

    $bySource = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments?source=admin_bulk');
    expect($bySource->json('data'))->toHaveCount(1);
    expect($bySource->json('data.0.source'))->toBe('admin_bulk');

    $byName = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments?search=Grace');
    expect($byName->json('data'))->toHaveCount(1);
    expect($byName->json('data.0.student.email'))->toBe('grace@navy.mil');

    $byEmail = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments?search=navy.mil');
    expect($byEmail->json('data'))->toHaveCount(1);
});

it('rejects invalid filter values with the validation envelope', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments?status=cancelled');

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['status'], responseKey: 'error.fields');
});

it('paginates the roster 25 per page', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    Enrolment::factory()->for($course)->count(26)->create();

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/enrolments');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(25);
    expect($response->json('meta.total'))->toBe(26);
    expect($response->json('meta.last_page'))->toBe(2);
});

it('lets an admin revoke a confirmed enrolment and audits the change', function (): void {
    $admin = User::factory()->admin()->create();
    $enrolment = Enrolment::factory()->create();

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
        'status' => 'withdrawn',
    ]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'withdrawn');
    expect($enrolment->fresh()->status)->toBe(EnrolmentStatus::Withdrawn);
    $this->assertDatabaseHas('audit_logs', [
        'action' => 'enrolment.status_changed',
        'entity_id' => $enrolment->id,
        'actor_id' => $admin->id,
    ]);
});

it('lets an admin confirm a waitlisted enrolment, taking a seat and creating the order', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['price' => 15000]);
    $section = CourseSection::factory()->for($course)->withSeatsAvailable(capacity: 2, taken: 0)->create();
    $enrolment = Enrolment::factory()->for($course)->for($section, 'section')->create([
        'status' => EnrolmentStatus::Waitlisted,
    ]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
        'status' => 'confirmed',
    ]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'confirmed');
    expect($section->fresh()->seats_taken)->toBe(1);
    $this->assertDatabaseHas('orders', [
        'student_id' => $enrolment->student_id,
        'course_id' => $course->id,
        'enrolment_id' => $enrolment->id,
    ]);
});

it('blocks confirming a waitlisted enrolment when the section is full', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $section = CourseSection::factory()->for($course)->withSeatsAvailable(capacity: 1, taken: 1)->create();
    $enrolment = Enrolment::factory()->for($course)->for($section, 'section')->create([
        'status' => EnrolmentStatus::Waitlisted,
    ]);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
        'status' => 'confirmed',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['status'], responseKey: 'error.fields');
    expect($enrolment->fresh()->status)->toBe(EnrolmentStatus::Waitlisted);
});

it('scopes status changes to instructors of the course and denies students', function (): void {
    $instructor = User::factory()->instructor()->create();
    $ownCourse = Course::factory()->create();
    $otherCourse = Course::factory()->create();
    $ownCourse->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $ownEnrolment = Enrolment::factory()->for($ownCourse)->create();
    $otherEnrolment = Enrolment::factory()->for($otherCourse)->create();

    $this->actingAs($instructor)
        ->patchJson("/api/v1/admin/enrolments/{$ownEnrolment->id}/status", ['status' => 'withdrawn'])
        ->assertOk();
    expect($ownEnrolment->fresh()->status)->toBe(EnrolmentStatus::Withdrawn);

    $this->actingAs($instructor)
        ->patchJson("/api/v1/admin/enrolments/{$otherEnrolment->id}/status", ['status' => 'withdrawn'])
        ->assertForbidden();

    $student = User::factory()->student()->create();
    $this->actingAs($student)
        ->patchJson("/api/v1/admin/enrolments/{$otherEnrolment->id}/status", ['status' => 'withdrawn'])
        ->assertForbidden();
});

it('rejects an unknown target status', function (): void {
    $admin = User::factory()->admin()->create();
    $enrolment = Enrolment::factory()->create();

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
        'status' => 'cancelled',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['status'], responseKey: 'error.fields');
});
