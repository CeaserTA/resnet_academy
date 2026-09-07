<?php

declare(strict_types=1);

namespace Tests\Feature\Resources;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseSectionStatus;
use App\Http\Resources\CourseApplicationResource;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CourseApplicationResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_application_resource_includes_cohort_course_for_cohort_applications(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohort = Cohort::factory()->create(['name' => 'Summer 2026 Intensive']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $resource = new CourseApplicationResource($application->load('cohortCourse.cohort'));
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('cohort_course', $array);
        $this->assertIsArray($array['cohort_course']);
        $this->assertEquals($cohortCourse->id, $array['cohort_course']['id']);
        $this->assertEquals($cohort->id, $array['cohort_course']['cohort_id']);
        $this->assertEquals('Summer 2026 Intensive', $array['cohort_course']['cohort_name']);
        $this->assertEquals($cohortCourse->status->value, $array['cohort_course']['status']);
    }

    public function test_course_application_resource_returns_simplified_cohort_course_object(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $cohort = Cohort::factory()->create(['name' => 'Fall 2026']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
            'capacity' => 50,
            'seats_taken' => 10,
        ]);

        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $resource = new CourseApplicationResource($application->load('cohortCourse.cohort'));
        $array = $resource->toArray(request());

        // Should only have id, cohort_id, cohort_name, status (not capacity, seats_taken, etc.)
        $this->assertCount(4, $array['cohort_course']);
        $this->assertArrayHasKey('id', $array['cohort_course']);
        $this->assertArrayHasKey('cohort_id', $array['cohort_course']);
        $this->assertArrayHasKey('cohort_name', $array['cohort_course']);
        $this->assertArrayHasKey('status', $array['cohort_course']);
        $this->assertArrayNotHasKey('capacity', $array['cohort_course']);
        $this->assertArrayNotHasKey('seats_taken', $array['cohort_course']);
    }
}
