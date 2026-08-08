<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Test for the /api/v1/account/avatar endpoint alias
 * Required by Progressive Student Profile Completion spec task 9.1
 * Validates Requirements: 10.2, 10.3, 10.4, 10.5
 */

it('POST /api/v1/account/avatar accepts JPEG, PNG, GIF, WEBP and validates max 5MB', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $student = User::factory()->student()->create();

    // Test JPEG
    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload('avatar.jpg'),
    ]);
    $response->assertOk();
    expect($response->json('data.avatar_url'))->toStartWith('http');

    // Test PNG
    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload('avatar.png'),
    ]);
    $response->assertOk();

    // Test GIF
    $gifContent = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    $gifFile = \Illuminate\Http\UploadedFile::fake()->createWithContent('avatar.gif', $gifContent);
    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => $gifFile,
    ]);
    $response->assertOk();

    // Test WEBP
    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload('avatar.webp'),
    ]);
    $response->assertOk();
});

it('POST /api/v1/account/avatar rejects files larger than 5MB', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();

    // Create a 6MB file (5120 KB is the limit, so 6000 KB should fail)
    $largeFile = \Illuminate\Http\UploadedFile::fake()->create('avatar.jpg', 6000);

    $response = $this->actingAs($student)
        ->postJson('/api/v1/account/avatar', [
            'avatar' => $largeFile,
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['avatar']);
});

it('POST /api/v1/account/avatar uploads to R2 storage and updates avatar_url', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $student = User::factory()->student()->create(['avatar_url' => null]);

    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload(),
    ]);

    $response->assertOk();
    
    $student->refresh();
    expect($student->avatar_url)->not->toBeNull();
    expect($student->avatar_url)->toStartWith('profiles/');
    
    // Verify file exists in storage
    Storage::disk('r2')->assertExists($student->avatar_url);
});

it('POST /api/v1/account/avatar returns updated UserResource', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $student = User::factory()->student()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload(),
    ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'data' => [
            'id',
            'name',
            'email',
            'avatar_url',
        ],
    ]);
    
    expect($response->json('data.name'))->toBe('John Doe');
    expect($response->json('data.email'))->toBe('john@example.com');
    expect($response->json('data.avatar_url'))->toStartWith('http');
});

it('POST /api/v1/account/avatar requires authentication', function (): void {
    $response = $this->postJson('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload(),
    ]);

    $response->assertUnauthorized();
});

it('POST /api/v1/account/avatar rejects non-image files', function (): void {
    $student = User::factory()->student()->create();

    $response = $this->actingAs($student)
        ->postJson('/api/v1/account/avatar', [
            'avatar' => \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100),
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['avatar']);
});
