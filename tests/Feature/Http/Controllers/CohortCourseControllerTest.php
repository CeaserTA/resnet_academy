<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CohortCourseControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_list_cohort_offerings_for_a_course(): void
    {
        $course = Course::factory()->create();
        $cohort1 = Cohort::factory()->create(['name' => 'Spring 2026']);
        $cohort2 = Cohort::factory()->create(['name' => 'Fall 2026']);
        CohortCourse::factory()->create(['course_id' => $course->id, 'cohort_id' => $cohort1->id]);
        CohortCourse::factory()->create(['course_id' => $course->id, 'cohort_id' => $cohort2->id]);

        $response = $this->getJson("/api/v1/courses/{$course->id}/cohort-courses");

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonFragment(['cohort_name' => 'Spring 2026']);
        $response->assertJsonFragment(['cohort_name' => 'Fall 2026']);
    }

    public function test_admin_can_attach_a_course_to_a_cohort(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $course->id,
            'capacity' => 30,
            'status' => CourseSectionStatus::Draft->value,
            'primary_instructor_id' => $admin->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('cohort_courses', [
            'cohort_id' => $cohort->id,
            'course_id' => $course->id,
            'capacity' => 30,
            'seats_taken' => 0,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'cohort_course.created',
            'entity_type' => 'cohort_course',
            'actor_id' => $admin->id,
        ]);
    }

    public function test_instructor_can_attach_a_course_to_a_cohort(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();

        $response = $this->actingAs($instructor)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $course->id,
            'capacity' => 25,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('cohort_courses', [
            'cohort_id' => $cohort->id,
            'course_id' => $course->id,
        ]);
    }

    public function test_student_cannot_attach_a_course_to_a_cohort(): void
    {
        $student = User::factory()->create(['role' => UserRole::Student]);
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();

        $response = $this->actingAs($student)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertForbidden();
    }

    public function test_cannot_attach_the_same_course_to_a_cohort_twice(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();
        CohortCourse::factory()->create(['course_id' => $course->id, 'cohort_id' => $cohort->id]);

        $response = $this->actingAs($admin)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['course_id'], responseKey: 'error.fields');
    }

    public function test_attach_validates_capacity_positive(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohort = Cohort::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $course->id,
            'capacity' => 0, // Invalid
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['capacity'], responseKey: 'error.fields');
    }

    public function test_can_update_cohort_course_capacity(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'capacity' => 25,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'capacity' => 30,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'capacity' => 30,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'cohort_course.updated',
            'entity_type' => 'cohort_course',
            'entity_id' => $cohortCourse->id,
        ]);
    }

    public function test_cannot_decrease_capacity_below_seats_taken(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'capacity' => 30,
            'seats_taken' => 25,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'capacity' => 20, // Below seats_taken
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['capacity'], responseKey: 'error.fields');
    }

    public function test_capacity_increase_promotes_waitlisted_students(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create(['price' => 100.00]);
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'capacity' => 2,
            'seats_taken' => 2,
        ]);

        // Create confirmed enrollments (fills capacity)
        $confirmedStudent1 = User::factory()->create();
        $confirmedStudent2 = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $confirmedStudent1->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $confirmedStudent2->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Create waitlisted enrollments
        $waitlistedStudent1 = User::factory()->create();
        $waitlistedStudent2 = User::factory()->create();
        $waitlisted1 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent1->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHours(2),
        ]);
        $waitlisted2 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent2->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHour(),
        ]);

        // Increase capacity to 3 (should promote oldest waitlisted)
        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'capacity' => 3,
        ]);

        $response->assertOk();

        // Oldest waitlisted should be promoted
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlisted1->id,
            'status' => EnrolmentStatus::Confirmed->value,
        ]);

        // Second should still be waitlisted
        $this->assertDatabaseHas('enrolments', [
            'id' => $waitlisted2->id,
            'status' => EnrolmentStatus::Waitlisted->value,
        ]);

        // Seats_taken should be 3
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'seats_taken' => 3,
        ]);

        // Order should be created for promoted student
        $this->assertDatabaseHas('orders', [
            'enrolment_id' => $waitlisted1->id,
            'student_id' => $waitlistedStudent1->id,
        ]);

        // Notification should be sent
        $this->assertDatabaseHas('notifications', [
            'user_id' => $waitlistedStudent1->id,
            'type' => 'waitlist_promoted',
        ]);
    }

    public function test_update_validates_status_transitions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Completed,
        ]);

        // Cannot go from Completed back to Draft
        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['status'], responseKey: 'error.fields');
    }

    public function test_can_transition_from_draft_to_open(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'status' => CourseSectionStatus::Open->value,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'status' => CourseSectionStatus::Open->value,
        ]);
    }

    public function test_can_update_price_override(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create(['price' => 100.00, 'currency' => 'USD']);
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/cohort-courses/{$cohortCourse->id}", [
            'price_override' => 75.00,
            'currency_override' => 'EUR',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('cohort_courses', [
            'id' => $cohortCourse->id,
            'price_override' => '75.00',
            'currency_override' => 'EUR',
        ]);
    }

    public function test_cannot_delete_cohort_course_with_confirmed_enrollments(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohort-courses/{$cohortCourse->id}");

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['cohort_course'], responseKey: 'error.fields');
        $this->assertDatabaseHas('cohort_courses', ['id' => $cohortCourse->id]);
    }

    public function test_cannot_delete_cohort_course_with_pending_applications(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohort-courses/{$cohortCourse->id}");

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['cohort_course'], responseKey: 'error.fields');
        $this->assertDatabaseHas('cohort_courses', ['id' => $cohortCourse->id]);
    }

    public function test_can_delete_cohort_course_with_no_enrollments_or_applications(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohort-courses/{$cohortCourse->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('cohort_courses', ['id' => $cohortCourse->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'cohort_course.deleted',
            'entity_type' => 'cohort_course',
            'entity_id' => $cohortCourse->id,
        ]);
    }

    public function test_cannot_delete_cohort_course_with_withdrawn_enrollments(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Withdrawn,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohort-courses/{$cohortCourse->id}");

        // Even withdrawn enrollments prevent deletion - the offering has history
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['cohort_course'], responseKey: 'error.fields');
        $this->assertDatabaseHas('cohort_courses', ['id' => $cohortCourse->id]);
    }

    public function test_show_cohort_course_includes_enrollment_and_application_counts(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        // enrolled_count reflects seats_taken (kept authoritative by EnrolmentService), which
        // these directly-inserted fixture enrolments below don't touch — so it's set explicitly
        // here to match the 2 confirmed rows created.
        $cohortCourse = CohortCourse::factory()->create(['course_id' => $course->id, 'seats_taken' => 2]);

        // Create 2 confirmed, 1 waitlisted
        $students = User::factory()->count(3)->create();
        Enrolment::factory()->create([
            'student_id' => $students[0]->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $students[1]->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $students[2]->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        // Create 1 pending application
        $applicant = User::factory()->create();
        CourseApplication::factory()->create([
            'student_id' => $applicant->id,
            'course_id' => $course->id,
            'cohort_course_id' => $cohortCourse->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/v1/cohort-courses/{$cohortCourse->id}");

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'enrolled_count' => 2,
                'waitlisted_count' => 1,
                'applications_pending_count' => 1,
            ],
        ]);
    }
}
