<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Enums\CourseSectionStatus;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CohortCourseTest extends TestCase
{
    use RefreshDatabase;

    public function test_cohort_course_has_correct_relationships(): void
    {
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();
        $instructor = User::factory()->create();

        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'cohort_id' => $cohort->id,
            'primary_instructor_id' => $instructor->id,
        ]);

        $this->assertTrue($cohortCourse->course->is($course));
        $this->assertTrue($cohortCourse->cohort->is($cohort));
        $this->assertTrue($cohortCourse->primaryInstructor->is($instructor));
    }

    public function test_cohort_course_casts_status_enum(): void
    {
        $cohortCourse = CohortCourse::factory()->create(['status' => 'open']);

        $this->assertInstanceOf(CourseSectionStatus::class, $cohortCourse->status);
        $this->assertEquals(CourseSectionStatus::Open, $cohortCourse->status);
    }

    public function test_is_full_returns_true_when_capacity_reached(): void
    {
        $cohortCourse = CohortCourse::factory()->create([
            'capacity' => 10,
            'seats_taken' => 10,
        ]);

        $this->assertTrue($cohortCourse->isFull());
    }

    public function test_is_full_returns_false_when_seats_available(): void
    {
        $cohortCourse = CohortCourse::factory()->create([
            'capacity' => 10,
            'seats_taken' => 5,
        ]);

        $this->assertFalse($cohortCourse->isFull());
    }

    public function test_is_full_returns_false_when_capacity_is_null(): void
    {
        $cohortCourse = CohortCourse::factory()->create([
            'capacity' => null,
            'seats_taken' => 100,
        ]);

        $this->assertFalse($cohortCourse->isFull());
    }

    public function test_is_accepting_applications_returns_false_when_status_not_open(): void
    {
        $cohortCourse = CohortCourse::factory()->create([
            'status' => CourseSectionStatus::Draft,
        ]);

        $this->assertFalse($cohortCourse->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_false_when_cohort_deadline_passed(): void
    {
        $cohort = Cohort::factory()->create(['application_deadline' => now()->subDays(1)]);
        $cohortCourse = CohortCourse::factory()->create([
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $this->assertFalse($cohortCourse->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_true_when_open_and_no_deadline(): void
    {
        $cohort = Cohort::factory()->create(['application_deadline' => null]);
        $cohortCourse = CohortCourse::factory()->create([
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $this->assertTrue($cohortCourse->isAcceptingApplications());
    }

    public function test_is_accepting_applications_returns_true_when_open_and_deadline_future(): void
    {
        $cohort = Cohort::factory()->create(['application_deadline' => now()->addDays(7)]);
        $cohortCourse = CohortCourse::factory()->create([
            'cohort_id' => $cohort->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $this->assertTrue($cohortCourse->isAcceptingApplications());
    }

    public function test_resolved_price_falls_back_to_course_price_when_no_override(): void
    {
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'price_override' => null,
            'currency_override' => null,
        ]);

        [$price, $currency] = $cohortCourse->resolvedPrice();

        $this->assertEquals('100.00', $price);
        $this->assertEquals('USD', $currency);
    }

    public function test_resolved_price_uses_override_when_set(): void
    {
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'price_override' => 75.00,
            'currency_override' => 'EUR',
        ]);

        [$price, $currency] = $cohortCourse->resolvedPrice();

        $this->assertEquals('75.00', $price);
        $this->assertEquals('EUR', $currency);
    }
}
