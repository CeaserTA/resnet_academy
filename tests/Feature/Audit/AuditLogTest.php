<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Module;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('audits an assignment grade change with the grader as actor', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    $module = Module::factory()->for($course)->create();
    $assignment = Assignment::factory()->for($module)->create();
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $submission = $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'Answer.',
    ])->json('data.id');

    $this->actingAs($instructor)->postJson("/api/v1/submissions/{$submission}/grade", ['raw_score' => 90])->assertOk();

    $log = AuditLog::where('action', 'grade.changed')->where('entity_type', 'assignment_submission')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($instructor->id);
    expect($log->entity_id)->toBe((int) $submission);
});

it('audits an enrolment withdrawal with the from/to status in meta', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $enrolment = app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($student)->postJson("/api/v1/enrolments/{$enrolment->id}/withdraw");

    $response->assertOk();
    $response->assertJsonPath('data.status', 'withdrawn');

    $log = AuditLog::where('action', 'enrolment.status_changed')->where('entity_id', $enrolment->id)->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
    expect($log->meta)->toBe(['from' => 'confirmed', 'to' => 'withdrawn']);
});

it('denies a student from withdrawing another students enrolment', function (): void {
    $owner = User::factory()->student()->create();
    $other = User::factory()->student()->create();
    $course = Course::factory()->create();
    $enrolment = app(EnrolmentService::class)->enrol($owner, $course, EnrolmentSource::Self);

    $response = $this->actingAs($other)->postJson("/api/v1/enrolments/{$enrolment->id}/withdraw");

    $response->assertForbidden();
});

it('audits a role change and blocks an admin from changing their own role', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();

    $selfChange = $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'instructor']);
    $selfChange->assertStatus(422);

    $response = $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$instructor->id}", ['status' => 'suspended']);
    $response->assertOk();
    $response->assertJsonPath('data.status', 'suspended');

    $log = AuditLog::where('action', 'user.status_changed')->where('entity_id', $instructor->id)->first();
    expect($log)->not->toBeNull();
    expect($log->meta)->toBe(['from' => 'active', 'to' => 'suspended']);
});

it('denies a non-admin from viewing the audit log', function (): void {
    $instructor = User::factory()->instructor()->create();

    $response = $this->actingAs($instructor)->getJson('/api/v1/admin/audit-logs');

    $response->assertForbidden();
});

it('lets an admin filter the audit log by entity type', function (): void {
    $admin = User::factory()->admin()->create();
    AuditLog::factory()->create(['entity_type' => 'enrolment', 'action' => 'enrolment.confirmed']);
    AuditLog::factory()->create(['entity_type' => 'user', 'action' => 'user.provisioned']);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/audit-logs?entity_type=user');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.entity_type', 'user');
});
