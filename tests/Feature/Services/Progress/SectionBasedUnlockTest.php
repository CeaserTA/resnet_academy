<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Progress;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentStatus;
use App\Enums\ModuleProgressStatus;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\User;
use App\Services\Progress\ProgressEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class SectionBasedUnlockTest extends TestCase
{
    use RefreshDatabase;

    private ProgressEngine $progressEngine;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Queue::fake();
        Notification::fake();

        $this->progressEngine = $this->app->make(ProgressEngine::class);
    }

    /**
     * @return CohortCourse
     */
    private function cohortCourseStartingOn(Course $course, \DateTimeInterface|string $startDate): CohortCourse
    {
        $cohort = Cohort::factory()->create(['start_date' => $startDate]);

        return CohortCourse::factory()->create([
            'course_id' => $course->id,
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::InProgress,
        ]);
    }

    public function test_module_unlocks_based_on_cohort_start_date_and_offset(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDays(10));

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module with unlock_offset_days = 5 (should unlock 5 days after cohort start)
        $module = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 5,
            'scheduled_start_at' => null, // Ignore absolute scheduling
            'order_index' => 1,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module should be unlocked (cohort started 10 days ago, offset is 5 days)
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);

        $progress = ModuleProgress::where('student_id', $student->id)
            ->where('module_id', $module->id)
            ->first();
        $this->assertNotNull($progress->unlocked_at);
    }

    public function test_module_stays_locked_when_cohort_offset_not_reached(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDays(3));

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module with unlock_offset_days = 7 (should unlock 7 days after cohort start)
        $module = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 7,
            'scheduled_start_at' => null,
            'order_index' => 1,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module should remain locked (only 3 days passed, needs 7)
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgressStatus::Locked->value,
        ]);
    }

    public function test_cohort_relative_scheduling_takes_precedence_over_absolute(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDays(10));

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module with BOTH unlock_offset_days and scheduled_start_at
        // Cohort-relative should take precedence
        $module = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 5, // 5 days after cohort start = 5 days ago (should unlock)
            'scheduled_start_at' => now()->addDays(10), // Future date (would stay locked if this was used)
            'order_index' => 1,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module should unlock based on cohort offset, not scheduled_start_at
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);
    }

    public function test_module_with_zero_offset_unlocks_on_cohort_start(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDay());

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module with unlock_offset_days = 0 (unlocks immediately on cohort start)
        $module = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 0,
            'scheduled_start_at' => null,
            'order_index' => 1,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module should be unlocked
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);
    }

    public function test_cohort_based_unlock_respects_sequential_prerequisite(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDays(30));

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module 1: offset 0, should unlock immediately
        $module1 = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 0,
            'order_index' => 1,
        ]);

        // Module 2: offset 5, schedule reached but module1 not complete
        $module2 = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => 5,
            'order_index' => 2,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module 1 should be unlocked
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module1->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);

        // Module 2 should remain locked (schedule reached but module1 not completed)
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module2->id,
            'status' => ModuleProgressStatus::Locked->value,
        ]);

        // Complete module 1
        ModuleProgress::where('student_id', $student->id)
            ->where('module_id', $module1->id)
            ->update(['status' => ModuleProgressStatus::Completed, 'completed_at' => now()]);

        // Re-evaluate
        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Now module 2 should unlock
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module2->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);
    }

    public function test_module_without_offset_uses_scheduled_start_at_even_in_a_cohort(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = $this->cohortCourseStartingOn($course, now()->subDays(10));

        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Module in a cohort but with no unlock_offset_days - uses scheduled_start_at
        $module = Module::factory()->create([
            'course_id' => $course->id,
            'unlock_offset_days' => null,
            'scheduled_start_at' => now()->subDays(2),
            'order_index' => 1,
        ]);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        // Module should unlock based on scheduled_start_at
        $this->assertDatabaseHas('module_progress', [
            'student_id' => $student->id,
            'module_id' => $module->id,
            'status' => ModuleProgressStatus::NotStarted->value,
        ]);
    }
}
