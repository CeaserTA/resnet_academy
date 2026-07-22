<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('records a resource_viewed engagement event when a student marks a reading resource read', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    app(ProgressEngine::class)->markRead($student, $resource);

    $this->assertDatabaseHas('engagement_events', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'event_type' => 'resource_viewed',
    ]);
});

it('records an assignment_submitted engagement event on submission', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $assignment = Assignment::factory()->for($module)->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'assignment', 'item_id' => $assignment->id, 'order_index' => 1, 'is_required' => true]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'My answer.',
    ])->assertCreated();

    expect(EngagementEvent::where('student_id', $student->id)->where('event_type', 'assignment_submitted')->exists())->toBeTrue();
});
