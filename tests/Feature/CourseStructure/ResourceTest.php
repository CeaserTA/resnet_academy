<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Module;
use App\Models\ResourceDocument;
use App\Models\User;
use App\Services\Content\ResourceManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('creates a reading resource and its module item in one call', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'reading',
        'title' => 'Welcome lesson',
        'content_html' => '<p>Hello</p>',
    ]);

    $response->assertCreated();
    $resourceId = $response->json('data.id');

    $this->assertDatabaseHas('resources', ['id' => $resourceId, 'module_id' => $module->id, 'type' => 'reading']);
    $this->assertDatabaseHas('resource_readings', ['resource_id' => $resourceId, 'content_html' => '<p>Hello</p>']);
    $this->assertDatabaseHas('module_items', ['item_type' => 'resource', 'item_id' => $resourceId, 'is_required' => true]);
});

it('creates a video resource with its bunny stream id', function (): void {
    $admin = User::factory()->admin()->create();
    $module = Module::factory()->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'video',
        'title' => 'Intro video',
        'bunny_stream_video_id' => 'abc-123',
        'duration_seconds' => 300,
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('resource_videos', ['bunny_stream_video_id' => 'abc-123', 'duration_seconds' => 300]);
});

it('rejects a video resource missing its bunny stream id', function (): void {
    $admin = User::factory()->admin()->create();
    $module = Module::factory()->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'video',
        'title' => 'Intro video',
    ]);

    $response->assertUnprocessable();
});

it('deletes a resource and its module item together', function (): void {
    $admin = User::factory()->admin()->create();
    $module = Module::factory()->create();

    $resource = app(ResourceManager::class)->create($module, [
        'type' => 'reading',
        'title' => 'Doomed lesson',
        'content_html' => '<p>Bye</p>',
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/v1/resources/{$resource->id}");

    $response->assertNoContent();
    $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
    $this->assertDatabaseMissing('module_items', ['item_type' => 'resource', 'item_id' => $resource->id]);
});

it('denies a student from creating a resource', function (): void {
    $student = User::factory()->student()->create();
    $module = Module::factory()->create();

    $response = $this->actingAs($student)->postJson("/api/v1/modules/{$module->id}/resources", [
        'type' => 'reading',
        'title' => 'Nope',
        'content_html' => '<p>x</p>',
    ]);

    $response->assertForbidden();
});

it('uploads a document resource file to R2, stores the path, and resolves a full URL in the response', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $response = $this->actingAs($admin)->post("/api/v1/modules/{$module->id}/resources", [
        'type' => 'document',
        'title' => 'Syllabus',
        'file_type' => 'pdf',
        'file' => UploadedFile::fake()->create('syllabus.pdf', 500),
    ]);

    $response->assertCreated();
    $resourceId = $response->json('data.id');
    $path = ResourceDocument::where('resource_id', $resourceId)->value('file_url');

    expect($path)->toStartWith("resources/{$course->id}/");
    Storage::disk('r2')->assertExists($path);
    expect($response->json('data.details.file_url'))->toStartWith('http');
});

it('uploads a scorm package to R2 via the package field', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    $admin = User::factory()->admin()->create();
    $module = Module::factory()->create();

    $response = $this->actingAs($admin)->post("/api/v1/modules/{$module->id}/resources", [
        'type' => 'scorm',
        'title' => 'SCORM package',
        'standard' => 'scorm_2004',
        'package' => UploadedFile::fake()->create('package.zip', 1000),
    ]);

    $response->assertCreated();
    expect($response->json('data.details.package_url'))->toStartWith('http');
});
