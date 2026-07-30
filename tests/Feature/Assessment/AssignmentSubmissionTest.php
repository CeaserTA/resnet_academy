<?php

declare(strict_types=1);

use App\Enums\AssignmentSubmissionType;
use App\Enums\EnrolmentSource;
use App\Enums\ModuleProgressStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\LatePenaltyPolicy;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Notification;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function setUpAssignmentForSubmission(?LatePenaltyPolicy $policy = null, ?Carbon\Carbon $dueAt = null): array
{
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);

    $module = Module::factory()->for($course)->create(['order_index' => 1]);

    $assignment = Assignment::factory()->for($module)->create([
        'due_at' => $dueAt ?? now()->addWeek(),
        'late_penalty_policy_id' => $policy?->id,
    ]);

    ModuleItem::create([
        'module_id' => $module->id,
        'item_type' => 'assignment',
        'item_id' => $assignment->id,
        'order_index' => 1,
        'is_required' => true,
    ]);

    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    return compact('admin', 'instructor', 'student', 'course', 'module', 'assignment');
}

function makeStandardLatePenaltyPolicy(): LatePenaltyPolicy
{
    $policy = LatePenaltyPolicy::factory()->create();
    $policy->tiers()->createMany([
        ['hours_late_from' => 0, 'hours_late_to' => 24, 'penalty_percent' => 10],
        ['hours_late_from' => 24, 'hours_late_to' => 48, 'penalty_percent' => 25],
        ['hours_late_from' => 48, 'hours_late_to' => null, 'penalty_percent' => 50],
    ]);

    return $policy;
}

it('completes the module item on submission, not on grading', function (): void {
    ['student' => $student, 'module' => $module, 'assignment' => $assignment] = setUpAssignmentForSubmission();

    $response = $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'My essay answer.',
    ]);

    $response->assertCreated();

    expect(
        ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first()->status,
    )->toBe(ModuleProgressStatus::Completed);
});

it('applies the correct tiered late penalty on submission', function (): void {
    $policy = makeStandardLatePenaltyPolicy();
    ['student' => $student, 'assignment' => $assignment] = setUpAssignmentForSubmission($policy, now()->subHours(30));

    $response = $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'Late answer.',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('assignment_submissions', [
        'assignment_id' => $assignment->id,
        'student_id' => $student->id,
        'is_late' => true,
        'late_penalty_percent' => 25,
    ]);
});

it('applies the late penalty to the final score when graded', function (): void {
    $policy = makeStandardLatePenaltyPolicy();
    ['student' => $student, 'instructor' => $instructor, 'assignment' => $assignment] = setUpAssignmentForSubmission($policy, now()->subHours(2));

    $submissionResponse = $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'Answer.',
    ]);
    $submissionId = $submissionResponse->json('data.id');

    $gradeResponse = $this->actingAs($instructor)->postJson("/api/v1/submissions/{$submissionId}/grade", [
        'raw_score' => 80,
    ]);

    $gradeResponse->assertOk();
    $gradeResponse->assertJsonPath('data.raw_score', '80.00');
    $gradeResponse->assertJsonPath('data.final_score', '72.00');

    expect(Notification::where('user_id', $student->id)->where('type', 'grade_posted')->exists())->toBeTrue();
});

it('uploads a real file to R2 and resolves it to a full URL in the response', function (): void {
    Storage::fake('r2', ['url' => 'https://cdn.test']);
    ['student' => $student, 'assignment' => $assignment] = setUpAssignmentForSubmission();
    $assignment->update(['submission_type' => AssignmentSubmissionType::File]);

    $response = $this->actingAs($student)->post("/api/v1/assignments/{$assignment->id}/submissions", [
        'file' => UploadedFile::fake()->create('project.zip', 100),
    ]);

    $response->assertCreated();
    $submission = AssignmentSubmission::where('assignment_id', $assignment->id)->firstOrFail();

    expect($submission->file_url)->toStartWith("submissions/{$assignment->id}/");
    Storage::disk('r2')->assertExists($submission->file_url);
    expect($response->json('data.file_url'))->toStartWith('http');
});

it('denies a student without a confirmed enrolment from submitting', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $module = Module::factory()->for($course)->create();
    $assignment = Assignment::factory()->for($module)->create();

    $response = $this->actingAs($student)->postJson("/api/v1/assignments/{$assignment->id}/submissions", [
        'text_content' => 'Not enrolled.',
    ]);

    $response->assertForbidden();
});
