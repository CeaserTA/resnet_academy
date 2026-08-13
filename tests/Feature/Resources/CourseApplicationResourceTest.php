<?php

declare(strict_types=1);

namespace Tests\Feature\Resources;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseSectionStatus;
use App\Http\Resources\CourseApplicationResource;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\CourseSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CourseApplicationResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_application_resource_includes_section_for_cohort_applications(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'name' => 'Summer 2026 Intensive',
            'status' => CourseSectionStatus::Open,
        ]);
        
        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => CourseApplicationStatus::Pending,
        ]);
        
        $resource = new CourseApplicationResource($application->load('section'));
        $array = $resource->toArray(request());
        
        $this->assertArrayHasKey('section', $array);
        $this->assertIsArray($array['section']);
        $this->assertEquals($section->id, $array['section']['id']);
        $this->assertEquals($section->name, $array['section']['name']);
        $this->assertEquals($section->status->value, $array['section']['status']);
    }

    public function test_course_application_resource_section_null_for_self_paced_applications(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        
        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => null,
            'status' => CourseApplicationStatus::Pending,
        ]);
        
        $resource = new CourseApplicationResource($application->load('section'));
        $array = $resource->toArray(request());
        
        $this->assertArrayHasKey('section', $array);
        $this->assertNull($array['section']);
    }

    public function test_course_application_resource_returns_simplified_section_object(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'enrolment_policy' => CourseEnrolmentPolicy::Application,
        ]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'name' => 'Fall 2026',
            'status' => CourseSectionStatus::Open,
            'capacity' => 50,
            'seats_taken' => 10,
        ]);
        
        $application = CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => CourseApplicationStatus::Pending,
        ]);
        
        $resource = new CourseApplicationResource($application->load('section'));
        $array = $resource->toArray(request());
        
        // Should only have id, name, status (not capacity, seats_taken, etc.)
        $this->assertCount(3, $array['section']);
        $this->assertArrayHasKey('id', $array['section']);
        $this->assertArrayHasKey('name', $array['section']);
        $this->assertArrayHasKey('status', $array['section']);
        $this->assertArrayNotHasKey('capacity', $array['section']);
        $this->assertArrayNotHasKey('seats_taken', $array['section']);
    }
}
