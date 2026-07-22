<?php

declare(strict_types=1);

use App\Models\Certificate;
use App\Models\User;

it('lets anyone verify a certificate by its number without authenticating', function (): void {
    $certificate = Certificate::factory()->create();

    $response = $this->getJson("/api/v1/certificates/verify/{$certificate->certificate_number}");

    $response->assertOk();
    $response->assertJsonPath('data.valid', true);
    $response->assertJsonPath('data.certificate_number', $certificate->certificate_number);
    $response->assertJsonPath('data.student_name', $certificate->student->name);
    $response->assertJsonPath('data.course_title', $certificate->course->title);
    $response->assertJsonMissingPath('data.student.email');
});

it('returns not found for an unknown certificate number', function (): void {
    $response = $this->getJson('/api/v1/certificates/verify/CERT-DOES-NOT-EXIST');

    $response->assertNotFound();
});

it('lets a student see only their own certificates', function (): void {
    $student = User::factory()->student()->create();
    $otherStudent = User::factory()->student()->create();

    Certificate::factory()->for($student, 'student')->create();
    Certificate::factory()->for($otherStudent, 'student')->create();

    $response = $this->actingAs($student)->getJson('/api/v1/certificates');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});

it('denies a student from viewing another students certificate directly', function (): void {
    $owner = User::factory()->student()->create();
    $other = User::factory()->student()->create();
    $certificate = Certificate::factory()->for($owner, 'student')->create();

    $response = $this->actingAs($other)->getJson("/api/v1/certificates/{$certificate->id}");

    $response->assertForbidden();
});

it('lets an admin view any certificate', function (): void {
    $admin = User::factory()->admin()->create();
    $certificate = Certificate::factory()->create();

    $response = $this->actingAs($admin)->getJson("/api/v1/certificates/{$certificate->id}");

    $response->assertOk();
});
