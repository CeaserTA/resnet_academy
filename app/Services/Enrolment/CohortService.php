<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Business logic for a cohort (intake) itself — the "admin posts a cohort, then assigns
 * courses to it" flow lives here via attachCourse()/detachCourse(), delegating the
 * per-offering capacity/waitlist logic to CohortCourseService.
 */
final class CohortService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CohortCourseService $cohortCourseService,
    ) {}

    public function create(array $data, int $actorId): Cohort
    {
        return DB::transaction(function () use ($data, $actorId): Cohort {
            $cohort = Cohort::create([
                ...$data,
                'created_by' => $actorId,
            ])->fresh();

            $this->auditLogger->log(
                action: 'cohort.created',
                entityType: 'cohort',
                entityId: $cohort->id,
                actorId: $actorId,
                meta: ['name' => $cohort->name],
            );

            return $cohort;
        });
    }

    public function update(Cohort $cohort, array $data, int $actorId): Cohort
    {
        DB::transaction(function () use ($cohort, $data, $actorId): void {
            $cohort->update($data);

            $this->auditLogger->log(
                action: 'cohort.updated',
                entityType: 'cohort',
                entityId: $cohort->id,
                actorId: $actorId,
                meta: ['changes' => array_keys($data)],
            );
        });

        return $cohort->fresh();
    }

    /**
     * Only allowed if no course under this cohort has any enrollment/application history —
     * mirrors CohortCourseService::delete()'s own guard, checked here per-offering so the
     * error names the specific course still blocking deletion.
     */
    public function delete(Cohort $cohort, int $actorId): void
    {
        DB::transaction(function () use ($cohort, $actorId): void {
            foreach ($cohort->cohortCourses as $cohortCourse) {
                if ($cohortCourse->enrolments()->exists() || $cohortCourse->applications()->exists()) {
                    throw ValidationException::withMessages([
                        'cohort' => 'Cannot delete a cohort with enrollment or application history. Archive it instead.',
                    ]);
                }
            }

            $this->auditLogger->log(
                action: 'cohort.deleted',
                entityType: 'cohort',
                entityId: $cohort->id,
                actorId: $actorId,
                meta: ['name' => $cohort->name],
            );

            $cohort->delete();
        });
    }

    /**
     * Assign an existing course to this cohort, creating its offering row with its own
     * capacity/instructor/price override.
     */
    public function attachCourse(Cohort $cohort, int $courseId, array $data, int $actorId): CohortCourse
    {
        return $this->cohortCourseService->create($cohort->id, $courseId, $data, $actorId);
    }

    /**
     * Remove a course's offering from this cohort. Delegates to CohortCourseService::delete()
     * for the enrollment/application-history guard.
     */
    public function detachCourse(CohortCourse $cohortCourse, int $actorId): void
    {
        $this->cohortCourseService->delete($cohortCourse, $actorId);
    }
}
