<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('lets a student upload a profile photo, stored under profiles/ on R2', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $student = User::factory()->student()->create();

    $response = $this->actingAs($student)->post('/api/v1/me/avatar', [
        'avatar' => fakeImageUpload(),
    ]);

    $response->assertOk();
    $student->refresh();

    expect($student->avatar_url)->toStartWith('profiles/');
    Storage::disk('r2')->assertExists($student->avatar_url);
    expect($response->json('data.avatar_url'))->toStartWith('http');
});

it('stores an instructor avatar under instructors/ and an admin avatar under admins/', function (): void {
    Storage::fake('r2');
    $instructor = User::factory()->instructor()->create();
    $admin = User::factory()->admin()->create();

    $this->actingAs($instructor)->post('/api/v1/me/avatar', ['avatar' => fakeImageUpload('a.jpg')]);
    $this->actingAs($admin)->post('/api/v1/me/avatar', ['avatar' => fakeImageUpload('b.jpg')]);

    expect($instructor->fresh()->avatar_url)->toStartWith('instructors/');
    expect($admin->fresh()->avatar_url)->toStartWith('admins/');
});

it('deletes the old avatar from R2 when a new one is uploaded', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();
    Storage::disk('r2')->put('profiles/old.jpg', 'fake-bytes');
    $student->update(['avatar_url' => 'profiles/old.jpg']);

    $this->actingAs($student)->post('/api/v1/me/avatar', ['avatar' => fakeImageUpload('new.jpg')]);

    Storage::disk('r2')->assertMissing('profiles/old.jpg');
    Storage::disk('r2')->assertExists($student->fresh()->avatar_url);
});

it('does not delete an external avatar URL (e.g. from Google) that was never stored on R2', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create(['avatar_url' => 'https://lh3.googleusercontent.com/a/abc123']);

    $response = $this->actingAs($student)->post('/api/v1/me/avatar', ['avatar' => fakeImageUpload('new.jpg')]);

    $response->assertOk();
    expect($student->fresh()->avatar_url)->toStartWith('profiles/');
});

it('rejects a non-image avatar upload and requires the field', function (): void {
    $student = User::factory()->student()->create();

    $this->actingAs($student)
        ->post('/api/v1/me/avatar', ['avatar' => UploadedFile::fake()->create('doc.pdf', 100)], ['Accept' => 'application/json'])
        ->assertUnprocessable();

    $this->actingAs($student)
        ->postJson('/api/v1/me/avatar', [])
        ->assertUnprocessable();
});

it('denies an unauthenticated request from uploading an avatar', function (): void {
    $this->post('/api/v1/me/avatar', ['avatar' => fakeImageUpload()], ['Accept' => 'application/json'])
        ->assertUnauthorized();
});

it('allows avatar upload via the /api/v1/account/avatar alias endpoint', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $student = User::factory()->student()->create();

    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => fakeImageUpload(),
    ]);

    $response->assertOk();
    $student->refresh();

    expect($student->avatar_url)->toStartWith('profiles/');
    Storage::disk('r2')->assertExists($student->avatar_url);
    expect($response->json('data.avatar_url'))->toStartWith('http');
});

it('accepts GIF image format for avatar uploads', function (): void {
    Storage::fake('r2');
    $student = User::factory()->student()->create();

    // Create a fake GIF file
    $gifContent = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    $gifFile = UploadedFile::fake()->createWithContent('avatar.gif', $gifContent);

    $response = $this->actingAs($student)->post('/api/v1/account/avatar', [
        'avatar' => $gifFile,
    ]);

    $response->assertOk();
    expect($student->fresh()->avatar_url)->toStartWith('profiles/');
});
