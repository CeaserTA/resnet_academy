<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Jobs\ImportEnrolmentsFromCsv;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Enrolment\BulkEnrolmentImporter;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

it('does not create duplicate enrolments on repeated bulk import', function (): void {
    Bus::fake();
    Storage::fake('local');

    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $existingStudent = User::factory()->student()->create(['email' => 'already@resnet.test']);
    $newStudent = User::factory()->student()->create(['email' => 'new@resnet.test']);

    app(EnrolmentService::class)->enrol($existingStudent, $course, EnrolmentSource::Self);

    $csv = "email\nalready@resnet.test\nnew@resnet.test\n";
    $path = Storage::disk('local')->path('bulk.csv');
    Storage::disk('local')->put('bulk.csv', $csv);

    $result = app(BulkEnrolmentImporter::class)->import($course, $path, $admin);

    expect($result['imported'])->toBe(1);
    expect($result['skipped'])->toHaveCount(1);
    expect(Enrolment::where('course_id', $course->id)->count())->toBe(2);
});

it('queues the CSV import instead of running it inline', function (): void {
    Bus::fake();
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $file = UploadedFile::fake()->createWithContent('roster.csv', "email\nsomeone@resnet.test\n");

    $response = $this->actingAs($admin)->postJson('/api/v1/enrolments/import', [
        'course_id' => $course->id,
        'file' => $file,
    ]);

    $response->assertStatus(202);
    Bus::assertDispatched(ImportEnrolmentsFromCsv::class);
});

it('denies bulk import to non-admins', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $file = UploadedFile::fake()->createWithContent('roster.csv', "email\nsomeone@resnet.test\n");

    $response = $this->actingAs($instructor)->postJson('/api/v1/enrolments/import', [
        'course_id' => $course->id,
        'file' => $file,
    ]);

    $response->assertForbidden();
});
