<?php

declare(strict_types=1);

use App\Enums\CourseLevel;
use App\Enums\CourseStatus;
use App\Models\Category;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('only shows published courses to the public catalogue', function (): void {
    Course::factory()->create(['status' => CourseStatus::Published]);
    Course::factory()->draft()->create();

    $response = $this->getJson('/api/v1/courses');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
});

it('filters the catalogue by category, level, and instructor', function (): void {
    $category = Category::factory()->create();
    $instructor = User::factory()->instructor()->create();

    $matching = Course::factory()->create([
        'category_id' => $category->id,
        'level' => CourseLevel::Advanced,
    ]);
    $matching->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    Course::factory()->create(['level' => CourseLevel::Beginner]);

    $response = $this->getJson("/api/v1/courses?category_id={$category->id}&level=advanced&instructor_id={$instructor->id}");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.id'))->toBe($matching->id);
});

it('denies course creation to a student', function (): void {
    $student = User::factory()->student()->create();

    $response = $this->actingAs($student)->postJson('/api/v1/courses', [
        'title' => 'New Course',
        'level' => 'beginner',
        'price' => 1000,
    ]);

    $response->assertForbidden();
});

it('validates required fields when an admin creates a course', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/courses', [
        'level' => 'beginner',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['title', 'price'], responseKey: 'error.fields');
});

it('lets an admin create a course', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/v1/courses', [
        'title' => 'New Course',
        'level' => 'beginner',
        'price' => 1000,
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('courses', ['title' => 'New Course', 'created_by' => $admin->id]);
});

it('uploads a course thumbnail to R2, stores the path, and resolves a full URL in the response', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->post('/api/v1/courses', [
        'title' => 'Course With Thumbnail',
        'level' => 'beginner',
        'price' => 1000,
        'thumbnail' => fakeImageUpload('thumb.jpg'),
    ]);

    $response->assertCreated();
    $course = Course::where('title', 'Course With Thumbnail')->firstOrFail();

    expect($course->thumbnail_url)->toStartWith('courses/');
    Storage::disk('r2')->assertExists($course->thumbnail_url);
    expect($response->json('data.thumbnail_url'))->toStartWith('http');
});

it('rejects a course thumbnail that is not an image', function (): void {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->post('/api/v1/courses', [
        'title' => 'Course With Bad Thumbnail',
        'level' => 'beginner',
        'price' => 1000,
        'thumbnail' => UploadedFile::fake()->create('not-an-image.pdf', 100),
    ], ['Accept' => 'application/json']);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['thumbnail'], responseKey: 'error.fields');
});

it('replaces an existing course thumbnail on update and deletes the old file from R2', function (): void {
    Storage::fake('r2');
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['thumbnail_url' => 'courses/old.jpg']);
    Storage::disk('r2')->put('courses/old.jpg', 'fake-bytes');

    $response = $this->actingAs($admin)->post("/api/v1/courses/{$course->id}", [
        '_method' => 'PATCH',
        'thumbnail' => fakeImageUpload('new.jpg'),
    ]);

    $response->assertOk();
    Storage::disk('r2')->assertMissing('courses/old.jpg');
    Storage::disk('r2')->assertExists($course->fresh()->thumbnail_url);
});
