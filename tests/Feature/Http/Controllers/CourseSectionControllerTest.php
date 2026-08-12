<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers;

use App\Enums\CourseApplicationStatus;
use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CourseSectionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_sections_for_course(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section1 = CourseSection::factory()->create(['course_id' => $course->id, 'name' => 'Spring 2026']);
        $section2 = CourseSection::factory()->create(['course_id' => $course->id, 'name' => 'Fall 2026']);

        $response = $this->actingAs($admin)->getJson("/api/v1/courses/{$course->id}/sections");

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonFragment(['name' => 'Spring 2026']);
        $response->assertJsonFragment(['name' => 'Fall 2026']);
    }

    public function test_instructor_can_list_sections_for_their_course(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);
        $course = Course::factory()->create();
        $course->instructors()->attach($instructor->id);
        CourseSection::factory()->create(['course_id' => $course->id]);

        $response = $this->actingAs($instructor)->getJson("/api/v1/courses/{$course->id}/sections");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_instructor_cannot_list_sections_for_other_instructors_course(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);
        $otherInstructor = User::factory()->create(['role' => UserRole::Instructor]);
        $course = Course::factory()->create();
        $course->instructors()->attach($otherInstructor->id);

        $response = $this->actingAs($instructor)->getJson("/api/v1/courses/{$course->id}/sections");

        $response->assertForbidden();
    }

    public function test_admin_can_create_section(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026 Cohort',
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-30',
            'application_deadline' => '2026-02-15',
            'capacity' => 30,
            'status' => CourseSectionStatus::Draft->value,
            'primary_instructor_id' => $admin->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('course_sections', [
            'course_id' => $course->id,
            'name' => 'Spring 2026 Cohort',
            'capacity' => 30,
            'seats_taken' => 0,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_section.created',
            'entity_type' => 'course_section',
            'actor_id' => $admin->id,
        ]);
    }

    public function test_instructor_can_create_section_for_their_course(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);
        $course = Course::factory()->create();
        $course->instructors()->attach($instructor->id);

        $response = $this->actingAs($instructor)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Fall 2026 Cohort',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-15',
            'capacity' => 25,
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('course_sections', [
            'course_id' => $course->id,
            'name' => 'Fall 2026 Cohort',
        ]);
    }

    public function test_instructor_cannot_create_section_for_other_instructors_course(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);
        $otherInstructor = User::factory()->create(['role' => UserRole::Instructor]);
        $course = Course::factory()->create();
        $course->instructors()->attach($otherInstructor->id);

        $response = $this->actingAs($instructor)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026',
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-30',
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertForbidden();
    }

    public function test_student_cannot_create_section(): void
    {
        $student = User::factory()->create(['role' => UserRole::Student]);
        $course = Course::factory()->create();

        $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026',
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-30',
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertForbidden();
    }

    public function test_create_section_validates_end_date_after_start_date(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026',
            'start_date' => '2026-06-30',
            'end_date' => '2026-03-01', // Before start date
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['end_date'], responseKey: 'error.fields');
    }

    public function test_create_section_validates_application_deadline_before_start_date(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026',
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-30',
            'application_deadline' => '2026-03-15', // After start date
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['application_deadline'], responseKey: 'error.fields');
    }

    public function test_create_section_validates_capacity_positive(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();

        $response = $this->actingAs($admin)->postJson("/api/v1/courses/{$course->id}/sections", [
            'name' => 'Spring 2026',
            'start_date' => '2026-03-01',
            'end_date' => '2026-06-30',
            'capacity' => 0, // Invalid
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['capacity'], responseKey: 'error.fields');
    }

    public function test_can_update_section_details(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'name' => 'Spring 2026',
            'capacity' => 25,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'name' => 'Spring 2026 Updated',
            'capacity' => 30,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'name' => 'Spring 2026 Updated',
            'capacity' => 30,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_section.updated',
            'entity_type' => 'course_section',
            'entity_id' => $section->id,
        ]);
    }

    public function test_can_increase_section_capacity(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'capacity' => 25,
            'seats_taken' => 25,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'capacity' => 30,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'capacity' => 30,
        ]);
    }

    public function test_cannot_decrease_capacity_below_seats_taken(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'capacity' => 30,
            'seats_taken' => 25,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'capacity' => 20, // Below seats_taken
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['capacity'], responseKey: 'error.fields');
    }

    public function test_capacity_increase_promotes_waitlisted_students(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'capacity' => 2,
            'seats_taken' => 2,
            'name' => 'Spring 2026',
        ]);

        // Create confirmed enrollments (fills capacity)
        $confirmedStudent1 = User::factory()->create();
        $confirmedStudent2 = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $confirmedStudent1->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $confirmedStudent2->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Create waitlisted enrollments
        $waitlistedStudent1 = User::factory()->create();
        $waitlistedStudent2 = User::factory()->create();
        $waitlisted1 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent1->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHours(2),
        ]);
        $waitlisted2 = Enrolment::factory()->create([
            'student_id' => $waitlistedStudent2->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
            'created_at' => now()->subHour(),
        ]);

        // Increase capacity to 3 (should promote oldest waitlisted)
        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
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
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
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

    public function test_capacity_increase_promotes_multiple_waitlisted_students(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create(['price' => 100.00]);
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'capacity' => 1,
            'seats_taken' => 1,
            'name' => 'Spring 2026',
        ]);

        // Create one confirmed enrollment
        $confirmedStudent = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $confirmedStudent->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        // Create 3 waitlisted enrollments
        $waitlistedStudents = User::factory()->count(3)->create();
        $waitlistedEnrolments = [];
        foreach ($waitlistedStudents as $index => $student) {
            $waitlistedEnrolments[] = Enrolment::factory()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $section->id,
                'status' => EnrolmentStatus::Waitlisted,
                'created_at' => now()->subHours(3 - $index),
            ]);
        }

        // Increase capacity from 1 to 4 (should promote all 3 waitlisted)
        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'capacity' => 4,
        ]);

        $response->assertOk();

        // All waitlisted should be promoted
        foreach ($waitlistedEnrolments as $enrolment) {
            $this->assertDatabaseHas('enrolments', [
                'id' => $enrolment->id,
                'status' => EnrolmentStatus::Confirmed->value,
            ]);
        }

        // Seats_taken should be 4
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'seats_taken' => 4,
        ]);
    }

    public function test_update_validates_status_transitions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Completed,
        ]);

        // Cannot go from Completed back to Draft
        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'status' => CourseSectionStatus::Draft->value,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['status'], responseKey: 'error.fields');
    }

    public function test_can_transition_from_draft_to_open(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Draft,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'status' => CourseSectionStatus::Open->value,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'status' => CourseSectionStatus::Open->value,
        ]);
    }

    public function test_can_transition_from_open_to_in_progress(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create([
            'course_id' => $course->id,
            'status' => CourseSectionStatus::Open,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/sections/{$section->id}", [
            'status' => CourseSectionStatus::InProgress->value,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('course_sections', [
            'id' => $section->id,
            'status' => CourseSectionStatus::InProgress->value,
        ]);
    }

    public function test_cannot_delete_section_with_confirmed_enrollments(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sections/{$section->id}");

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['section'], responseKey: 'error.fields');
        $this->assertDatabaseHas('course_sections', ['id' => $section->id]);
    }

    public function test_cannot_delete_section_with_waitlisted_enrollments(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sections/{$section->id}");

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['section'], responseKey: 'error.fields');
        $this->assertDatabaseHas('course_sections', ['id' => $section->id]);
    }

    public function test_cannot_delete_section_with_pending_applications(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        CourseApplication::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sections/{$section->id}");

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['section'], responseKey: 'error.fields');
        $this->assertDatabaseHas('course_sections', ['id' => $section->id]);
    }

    public function test_can_delete_section_with_no_enrollments_or_applications(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sections/{$section->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('course_sections', ['id' => $section->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'course_section.deleted',
            'entity_type' => 'course_section',
            'entity_id' => $section->id,
        ]);
    }

    public function test_cannot_delete_section_with_withdrawn_enrollments(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        $student = User::factory()->create();
        Enrolment::factory()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Withdrawn,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/sections/{$section->id}");

        // Even withdrawn enrollments prevent deletion - section has history
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['section'], responseKey: 'error.fields');
        $this->assertDatabaseHas('course_sections', ['id' => $section->id]);
    }

    public function test_show_section_includes_enrollment_and_application_counts(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $course = Course::factory()->create();
        $section = CourseSection::factory()->create(['course_id' => $course->id]);

        // Create 2 confirmed, 1 waitlisted
        $students = User::factory()->count(3)->create();
        Enrolment::factory()->create([
            'student_id' => $students[0]->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $students[1]->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Confirmed,
        ]);
        Enrolment::factory()->create([
            'student_id' => $students[2]->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => EnrolmentStatus::Waitlisted,
        ]);

        // Create 1 pending application
        $applicant = User::factory()->create();
        CourseApplication::factory()->create([
            'student_id' => $applicant->id,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'status' => CourseApplicationStatus::Pending,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/v1/sections/{$section->id}");

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
