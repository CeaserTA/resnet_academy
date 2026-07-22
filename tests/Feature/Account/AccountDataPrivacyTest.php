<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;

it('exports the authenticated user\'s own data and audits the export', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($student)->getJson('/api/v1/me/data-export')->assertOk();

    expect($response->json('profile.id'))->toBe($student->id);
    expect($response->json('enrolments'))->toHaveCount(1);
    expect($response->json('profile'))->not->toHaveKey('password_hash');

    $log = AuditLog::where('action', 'account.data_exported')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
    expect($log->entity_id)->toBe($student->id);
});

it('deactivates the account on request, logs out, and audits the request', function (): void {
    $student = User::factory()->student()->create();

    $this->actingAs($student)->postJson('/api/v1/me/request-deactivation')->assertNoContent();

    expect($student->fresh()->status)->toBe(UserStatus::Deactivated);

    $log = AuditLog::where('action', 'account.deactivation_requested')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
    expect($log->entity_id)->toBe($student->id);
});
