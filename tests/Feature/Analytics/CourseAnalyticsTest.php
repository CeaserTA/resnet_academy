<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\SubmissionStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\Notification;
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

it('computes risk_factor as No activity, Assignment backlog, or Inactive from real signals', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->create(['course_id' => $course->id]);
    $assignment = Assignment::factory()->create(['module_id' => $module->id, 'due_at' => now()->subDays(5)]);

    $noActivity = User::factory()->student()->create(['name' => 'No Activity Student']);
    enrolBackdated($course, $noActivity, 20);

    $backlog = User::factory()->student()->create(['name' => 'Backlog Student']);
    enrolBackdated($course, $backlog, 20);
    EngagementEvent::factory()->create([
        'student_id' => $backlog->id,
        'course_id' => $course->id,
        'created_at' => now()->subDays(20),
    ]);

    $inactiveOnly = User::factory()->student()->create(['name' => 'Inactive Only Student']);
    enrolBackdated($course, $inactiveOnly, 20);
    EngagementEvent::factory()->create([
        'student_id' => $inactiveOnly->id,
        'course_id' => $course->id,
        'created_at' => now()->subDays(20),
    ]);
    AssignmentSubmission::factory()->create(['assignment_id' => $assignment->id, 'student_id' => $inactiveOnly->id]);

    $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/analytics");

    $response->assertOk();
    $byName = collect($response->json('data.at_risk_students'))->keyBy('student.name');

    expect($byName->get('No Activity Student')['risk_factor'])->toBe('No activity');
    expect($byName->get('Backlog Student')['risk_factor'])->toBe('Assignment backlog');
    expect($byName->get('Inactive Only Student')['risk_factor'])->toBe('Inactive');
});

it('reports final_grade_percent for at-risk students matching the gradebook', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->create(['course_id' => $course->id]);
    $assignment = Assignment::factory()->create(['module_id' => $module->id, 'max_score' => 100]);

    $student = User::factory()->student()->create();
    enrolBackdated($course, $student, 20);

    AssignmentSubmission::factory()->create([
        'assignment_id' => $assignment->id,
        'student_id' => $student->id,
        'status' => SubmissionStatus::Graded,
        'final_score' => 80,
    ]);

    $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/analytics");

    $response->assertOk();
    $row = collect($response->json('data.at_risk_students'))->firstWhere('student.id', $student->id);

    expect((float) $row['final_grade_percent'])->toBe(80.0);
});

it('includes a roster row per confirmed enrolment with real progress and graduated status', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->create(['course_id' => $course->id]);

    $active = User::factory()->student()->create();
    enrolBackdated($course, $active, 1);

    $completedModules = User::factory()->student()->create();
    enrolBackdated($course, $completedModules, 1);
    ModuleProgress::updateOrCreate(
        ['student_id' => $completedModules->id, 'module_id' => $module->id],
        ['status' => 'completed', 'completed_at' => now()],
    );

    $graduated = User::factory()->student()->create();
    enrolBackdated($course, $graduated, 1);
    Certificate::factory()->for($graduated, 'student')->for($course)->create();

    $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/analytics");

    $response->assertOk();
    $byStudentId = collect($response->json('data.roster'))->keyBy('student.id');

    expect($byStudentId->get($active->id))
        ->toMatchArray(['percent_complete' => 0.0, 'status' => 'active']);
    expect($byStudentId->get($completedModules->id))
        ->toMatchArray(['percent_complete' => 100.0, 'status' => 'active']);
    expect($byStudentId->get($graduated->id)['status'])->toBe('graduated');
});

it('sends an at-risk reminder notification to every currently at-risk student and honors a custom message', function (): void {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);

    $atRisk = User::factory()->student()->create();
    enrolBackdated($course, $atRisk, 20);

    $onTrack = User::factory()->student()->create();
    enrolBackdated($course, $onTrack, 20);
    EngagementEvent::factory()->create([
        'student_id' => $onTrack->id,
        'course_id' => $course->id,
        'created_at' => now()->subDays(1),
    ]);

    $response = $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/at-risk-notice", [
        'message' => 'Custom check-in text',
    ]);

    $response->assertOk();
    $response->assertJsonPath('data.notified', 1);

    $notification = Notification::where('type', 'at_risk_reminder')->where('user_id', $atRisk->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->body)->toBe('Custom check-in text');

    expect(Notification::where('type', 'at_risk_reminder')->where('user_id', $onTrack->id)->exists())->toBeFalse();
});

it('denies a student and a non-teaching instructor from sending an at-risk notice', function (): void {
    $course = Course::factory()->create();
    $student = User::factory()->student()->create();
    $otherInstructor = User::factory()->instructor()->create();

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/at-risk-notice")->assertForbidden();
    $this->actingAs($otherInstructor)->postJson("/api/v1/courses/{$course->id}/at-risk-notice")->assertForbidden();
});
