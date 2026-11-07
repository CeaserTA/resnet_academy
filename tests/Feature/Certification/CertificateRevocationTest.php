<?php

declare(strict_types=1);

use App\Models\Certificate;
use App\Models\User;

// BACKEND_CHANGES.md §5 — an admin can withhold (revoke) a certificate and give it back.

it('lets an admin revoke a certificate, hiding it from the student and failing verification', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $certificate = Certificate::factory()->create(['student_id' => $student->id, 'certificate_url' => null]);

    $this->actingAs($admin)
        ->postJson("/api/v1/admin/certificates/{$certificate->id}/revoke", ['reason' => 'Payment dispute under review'])
        ->assertOk()
        ->assertJsonPath('data.status', 'revoked')
        ->assertJsonPath('data.revoke_reason', 'Payment dispute under review');

    $this->actingAs($student)->getJson('/api/v1/certificates')->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($student)->getJson("/api/v1/certificates/{$certificate->id}")->assertForbidden();
    $this->getJson("/api/v1/certificates/verify/{$certificate->certificate_number}")
        ->assertNotFound()
        ->assertJsonFragment(['message' => 'This certificate has been revoked and is no longer valid.']);

    $this->assertDatabaseHas('audit_logs', ['action' => 'certificate.revoked', 'entity_id' => $certificate->id]);
});

it('requires a reason and is admin-only', function (): void {
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $certificate = Certificate::factory()->create(['certificate_url' => null]);

    $this->actingAs($admin)->postJson("/api/v1/admin/certificates/{$certificate->id}/revoke")->assertUnprocessable();
    $this->actingAs($instructor)
        ->postJson("/api/v1/admin/certificates/{$certificate->id}/revoke", ['reason' => 'x'])
        ->assertForbidden();
});

it('restores a revoked certificate to its student', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $certificate = Certificate::factory()->create(['student_id' => $student->id, 'certificate_url' => null]);

    $this->actingAs($admin)->postJson("/api/v1/admin/certificates/{$certificate->id}/revoke", ['reason' => 'Check'])->assertOk();
    $this->actingAs($admin)
        ->postJson("/api/v1/admin/certificates/{$certificate->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'generating');

    $this->actingAs($student)->getJson('/api/v1/certificates')->assertJsonCount(1, 'data');
});
