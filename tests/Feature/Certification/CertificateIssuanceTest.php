<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Jobs\GenerateCertificatePdf;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Notification;
use App\Models\Resource;
use App\Models\User;
use App\Services\Certification\CertificateService;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('issues a certificate when the last module in a course completes', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 1]);
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $resource);

    $certificate = Certificate::where('student_id', $student->id)->where('course_id', $course->id)->first();

    expect($certificate)->not->toBeNull();
    expect($certificate->certificate_number)->toStartWith('CERT-');

    Bus::assertDispatched(GenerateCertificatePdf::class, fn ($job) => $job->certificateId === $certificate->id);
    expect(Notification::where('user_id', $student->id)->where('type', 'certificate_issued')->exists())->toBeTrue();
});

it('does not issue a certificate while a later module is still incomplete', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $first = Module::factory()->for($course)->create(['order_index' => 1]);
    $firstResource = Resource::factory()->for($first)->reading()->create();
    ModuleItem::create(['module_id' => $first->id, 'item_type' => 'resource', 'item_id' => $firstResource->id, 'order_index' => 1, 'is_required' => true]);

    $second = Module::factory()->for($course)->create(['order_index' => 2]);
    $secondResource = Resource::factory()->for($second)->reading()->create();
    ModuleItem::create(['module_id' => $second->id, 'item_type' => 'resource', 'item_id' => $secondResource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $firstResource);

    expect(Certificate::where('student_id', $student->id)->where('course_id', $course->id)->exists())->toBeFalse();
});

it('issues a certificate exactly once per student per course, even if triggered twice', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    app(CertificateService::class)->issueForCourseCompletion($student, $course);
    app(CertificateService::class)->issueForCourseCompletion($student, $course);

    expect(Certificate::where('student_id', $student->id)->where('course_id', $course->id)->count())->toBe(1);
    Bus::assertDispatchedTimes(GenerateCertificatePdf::class, 1);
});
