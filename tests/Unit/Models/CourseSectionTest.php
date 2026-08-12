<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Enums\CourseSectionStatus;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CourseSectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_section_has_correct_relationships(): void
    {
        $course = Course::factory()->create();
        $instructor = User::factory()->create();

        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'primary_instructor_id' => $instructor->id,
        ]);

        $this->assertTrue($section->course->is($course));
        $this->assertTrue($section->primaryInstructor->is($instructor));
    }

    public function test_course_section_casts_dates_correctly(): void
    {
        $section = CourseSection::factory()->create([
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-01',
            'application_deadline' => '2026-02-15',
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $section->start_date);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $section->end_date);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $section->application_deadline);
    }

    public function test_course_section_casts_status_enum(): void
    {
        $section = CourseSection::factory()->create(['status' => 'open']);

        $this->assertInstanceOf(CourseSectionStatus::class, $section->status);
        $this->assertEquals(CourseSectionStatus::Open, $section->status);
    }

    public function test_is_full_returns_true_when_capacity_reached(): void
    {
        $section = CourseSection::factory()->create([
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $this->assertTrue($section->isFull());
    }

    public function test_is_full_returns_false_when_seats_available(): void
    {
        $section = CourseSection::factory()->create([
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $this->assertFalse($section->isFull());
    }

    public function test_is_full_returns_false_when_capacity_is_null(): void
    {
        $section = CourseSection::factory()->create([
            'capacity' => null,
            'seats_taken' => 100,
        ]);

        $this->assertFalse($section->isFull());
    }

    public function test_is_accepting_applications_returns_false_when_status_not_open(): void
    {
        $section = CourseSection::factory()->create([
            'status' => CourseSectionStatus::Draft,
        ]);

        $this->assertFalse($section->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_false_when_deadline_passed(): void
    {
        $section = CourseSection::factory()->create([
            'status' => CourseSectionStatus::Open,
            'application_deadline' => now()->subDays(1),
        ]);

        $this->assertFalse($section->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_true_when_open_and_no_deadline(): void
    {
        $section = CourseSection::factory()->create([
            'status' => CourseSectionStatus::Open,
            'application_deadline' => null,
        ]);

        $this->assertTrue($section->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_true_when_open_and_deadline_future(): void
    {
        $section = CourseSection::factory()->create([
            'status' => CourseSectionStatus::Open,
            'application_deadline' => now()->addDays(7),
        ]);

        $this->assertTrue($section->isAcceptingApplications());
    }
}
