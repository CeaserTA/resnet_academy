<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers;

use App\Enums\CohortStatus;
use App\Enums\UserRole;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CohortControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_index_lists_published_cohorts_with_their_courses(): void
    {
        $published = Cohort::factory()->published()->create(['name' => 'September 2026 Intake']);
        $course = Course::factory()->create();
        CohortCourse::factory()->create(['cohort_id' => $published->id, 'course_id' => $course->id]);
        Cohort::factory()->create(['status' => CohortStatus::Draft]); // not published, excluded by default

        $response = $this->getJson('/api/v1/cohorts');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['name' => 'September 2026 Intake']);
        $response->assertJsonPath('data.0.courses.0.course_id', $course->id);
    }

    public function test_public_show_returns_a_cohort_with_its_courses(): void
    {
        $cohort = Cohort::factory()->create(['name' => 'January 2027 Intake']);
        $courseA = Course::factory()->create();
        $courseB = Course::factory()->create();
        CohortCourse::factory()->create(['cohort_id' => $cohort->id, 'course_id' => $courseA->id]);
        CohortCourse::factory()->create(['cohort_id' => $cohort->id, 'course_id' => $courseB->id]);

        $response = $this->getJson("/api/v1/cohorts/{$cohort->id}");

        $response->assertOk();
        $response->assertJsonPath('data.name', 'January 2027 Intake');
        $response->assertJsonCount(2, 'data.courses');
    }

    public function test_admin_can_create_a_cohort(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $response = $this->actingAs($admin)->postJson('/api/v1/cohorts', [
            'name' => 'September 2026 Intake',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-15',
            'application_deadline' => '2026-08-20',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('cohorts', [
            'name' => 'September 2026 Intake',
            'status' => CohortStatus::Draft->value,
            'created_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'cohort.created',
            'entity_type' => 'cohort',
            'actor_id' => $admin->id,
        ]);
    }

    public function test_non_admin_cannot_create_a_cohort(): void
    {
        $instructor = User::factory()->create(['role' => UserRole::Instructor]);

        $response = $this->actingAs($instructor)->postJson('/api/v1/cohorts', [
            'name' => 'September 2026 Intake',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-15',
        ]);

        $response->assertForbidden();
    }

    public function test_create_validates_end_date_after_start_date(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);

        $response = $this->actingAs($admin)->postJson('/api/v1/cohorts', [
            'name' => 'September 2026 Intake',
            'start_date' => '2026-12-15',
            'end_date' => '2026-09-01',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['end_date'], responseKey: 'error.fields');
    }

    public function test_admin_can_update_a_cohort(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $cohort = Cohort::factory()->create(['name' => 'Draft Intake', 'status' => CohortStatus::Draft]);

        $response = $this->actingAs($admin)->patchJson("/api/v1/cohorts/{$cohort->id}", [
            'name' => 'September 2026 Intake',
            'status' => CohortStatus::Published->value,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('cohorts', [
            'id' => $cohort->id,
            'name' => 'September 2026 Intake',
            'status' => CohortStatus::Published->value,
        ]);
    }

    public function test_admin_can_attach_multiple_courses_to_one_cohort(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $cohort = Cohort::factory()->create();
        $courseA = Course::factory()->create();
        $courseB = Course::factory()->create();

        $this->actingAs($admin)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $courseA->id,
            'capacity' => 30,
            'status' => 'open',
        ])->assertCreated();

        $this->actingAs($admin)->postJson("/api/v1/cohorts/{$cohort->id}/courses", [
            'course_id' => $courseB->id,
            'capacity' => 20,
            'status' => 'open',
        ])->assertCreated();

        $this->assertDatabaseCount('cohort_courses', 2);
        $this->assertDatabaseHas('cohort_courses', ['cohort_id' => $cohort->id, 'course_id' => $courseA->id]);
        $this->assertDatabaseHas('cohort_courses', ['cohort_id' => $cohort->id, 'course_id' => $courseB->id]);
    }

    public function test_admin_can_delete_an_untouched_cohort(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $cohort = Cohort::factory()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohorts/{$cohort->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('cohorts', ['id' => $cohort->id]);
    }

    public function test_admin_cannot_delete_a_cohort_with_enrollment_history(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $cohort = Cohort::factory()->create();
        $course = Course::factory()->create();
        $cohortCourse = CohortCourse::factory()->create(['cohort_id' => $cohort->id, 'course_id' => $course->id]);
        Enrolment::factory()->for($course)->for($cohortCourse, 'cohortCourse')->create();

        $response = $this->actingAs($admin)->deleteJson("/api/v1/cohorts/{$cohort->id}");

        $response->assertUnprocessable();
        $this->assertDatabaseHas('cohorts', ['id' => $cohort->id]);
    }
}
