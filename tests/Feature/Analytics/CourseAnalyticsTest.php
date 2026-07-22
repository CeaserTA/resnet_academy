<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

function enrolBackdated(Course $course, User $student, int $daysAgo): void
{
    $enrolment = app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);
    $enrolment->update(['applied_at' => now()->subDays($daysAgo)]);
}

it('computes the completion rate from certificates issued against confirmed enrolments', function (): void {
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->create();
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $completed = User::factory()->student()->create();
    $inProgress = User::factory()->student()->create();
    enrolBackdated($course, $completed, 20);
    enrolBackdated($course, $inProgress, 20);

    Certificate::factory()->for($completed, 'student')->for($course)->create();

    $response = $this->actingAs($instructor)->getJson("/api/v1/courses/{$course->id}/analytics");

    $response->assertOk();
    $response->assertJsonPath('data.total_students', 2);
    $response->assertJsonPath('data.completed_students', 1);
    $response->assertJsonPath('data.completion_rate', 50);
});

it('flags students as at-risk only once past the grace period and inactivity window, never once completed', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);

    $neverEngaged = User::factory()->student()->create(['name' => 'Never Engaged']);
    enrolBackdated($course, $neverEngaged, 20);

    $wentQuiet = User::factory()->student()->create(['name' => 'Went Quiet']);
    enrolBackdated($course, $wentQuiet, 20);
    EngagementEvent::factory()->create([
        'student_id' => $wentQuiet->id,
        'course_id' => $course->id,
        'event_type' => 'resource_viewed',
        'created_at' => now()->subDays(20),
    ]);

    $activelyEngaged = User::factory()->student()->create(['name' => 'Actively Engaged']);
    enrolBackdated($course, $activelyEngaged, 20);
    EngagementEvent::factory()->create([
        'student_id' => $activelyEngaged->id,
        'course_id' => $course->id,
        'event_type' => 'resource_viewed',
        'created_at' => now()->subDays(2),
    ]);

    $justEnrolled = User::factory()->student()->create(['name' => 'Just Enrolled']);
    enrolBackdated($course, $justEnrolled, 2);

    $completedButQuiet = User::factory()->student()->create(['name' => 'Completed But Quiet']);
    enrolBackdated($course, $completedButQuiet, 20);
    Certificate::factory()->for($completedButQuiet, 'student')->for($course)->create();

    $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/analytics");

    $response->assertOk();
    $atRiskNames = collect($response->json('data.at_risk_students'))->pluck('student.name');

    expect($atRiskNames)->toContain('Never Engaged', 'Went Quiet');
    expect($atRiskNames)->not->toContain('Actively Engaged', 'Just Enrolled', 'Completed But Quiet');
});

it('denies a student and an instructor who does not teach the course from viewing analytics', function (): void {
    $course = Course::factory()->create();
    $student = User::factory()->student()->create();
    $otherInstructor = User::factory()->instructor()->create();

    $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/analytics")->assertForbidden();
    $this->actingAs($otherInstructor)->getJson("/api/v1/courses/{$course->id}/analytics")->assertForbidden();
});
