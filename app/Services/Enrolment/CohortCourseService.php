<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\EnrolmentStatus;
use App\Models\CohortCourse;
use App\Models\Enrolment;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Business logic for a single course's offering within a cohort (capacity, instructor,
 * price override). Handles capacity changes with automatic waitlist promotion.
 */
final class CohortCourseService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly EnrolmentService $enrolmentService,
    ) {}

    /**
     * Attach a course to a cohort, creating its offering row.
     */
    public function create(int $cohortId, int $courseId, array $data, int $actorId): CohortCourse
    {
        $cohortCourse = CohortCourse::create([
            ...$data,
            'cohort_id' => $cohortId,
            'course_id' => $courseId,
            'seats_taken' => 0,
        ])->fresh();

        $this->auditLogger->log(
            action: 'cohort_course.created',
            entityType: 'cohort_course',
            entityId: $cohortCourse->id,
            actorId: $actorId,
            meta: ['cohort_id' => $cohortId, 'course_id' => $courseId],
        );

        return $cohortCourse;
    }

    /**
     * Update a cohort course offering.
     *
     * If capacity is increased and waitlisted students exist, automatically promote
     * oldest waitlisted students until capacity is reached or waitlist is empty.
     */
    public function update(CohortCourse $cohortCourse, array $data, int $actorId): CohortCourse
    {
        return DB::transaction(function () use ($cohortCourse, $data, $actorId) {
            $oldCapacity = $cohortCourse->capacity;
            $newCapacity = $data['capacity'] ?? $oldCapacity;

            // Validate capacity decrease
            if ($newCapacity !== null && $oldCapacity !== null && $newCapacity < $oldCapacity) {
                if ($newCapacity < $cohortCourse->seats_taken) {
                    throw ValidationException::withMessages([
                        'capacity' => 'Cannot reduce capacity below current enrollment count ('.$cohortCourse->seats_taken.').',
                    ]);
                }
            }

            $cohortCourse->update($data);

            $this->auditLogger->log(
                action: 'cohort_course.updated',
                entityType: 'cohort_course',
                entityId: $cohortCourse->id,
                actorId: $actorId,
                meta: [
                    'course_id' => $cohortCourse->course_id,
                    'changes' => array_keys($data),
                ],
            );

            // Handle capacity increase - promote waitlisted students
            if ($newCapacity !== null && ($oldCapacity === null || $newCapacity > $oldCapacity)) {
                $this->promoteWaitlistedStudents($cohortCourse);
            }

            return $cohortCourse->fresh();
        });
    }

    /**
     * Detach a course from a cohort (delete its offering row).
     * Only allowed if the offering has no enrollments (including withdrawn) or applications.
     * Use the "Closed" status instead for offerings with history.
     */
    public function delete(CohortCourse $cohortCourse, int $actorId): void
    {
        // Check for any enrollments at all (including withdrawn - has history)
        $hasAnyEnrollments = $cohortCourse->enrolments()->exists();

        if ($hasAnyEnrollments) {
            throw ValidationException::withMessages([
                'cohort_course' => 'Cannot remove a course with enrollment history from a cohort. Use the "Closed" status instead.',
            ]);
        }

        // Check for any applications (including rejected/dismissed - has history)
        $hasAnyApplications = $cohortCourse->applications()->exists();

        if ($hasAnyApplications) {
            throw ValidationException::withMessages([
                'cohort_course' => 'Cannot remove a course with application history from a cohort. Use the "Closed" status instead.',
            ]);
        }

        $this->auditLogger->log(
            action: 'cohort_course.deleted',
            entityType: 'cohort_course',
            entityId: $cohortCourse->id,
            actorId: $actorId,
            meta: [
                'cohort_id' => $cohortCourse->cohort_id,
                'course_id' => $cohortCourse->course_id,
            ],
        );

        $cohortCourse->delete();
    }

    /**
     * Promote waitlisted students when capacity increases.
     * Calls EnrolmentService::promoteFromWaitlist() for each student.
     */
    private function promoteWaitlistedStudents(CohortCourse $cohortCourse): void
    {
        $cohortCourse = CohortCourse::where('id', $cohortCourse->id)->lockForUpdate()->first();

        if ($cohortCourse === null) {
            return;
        }

        // Calculate available seats
        $availableSeats = $cohortCourse->capacity !== null
            ? $cohortCourse->capacity - $cohortCourse->seats_taken
            : PHP_INT_MAX;

        if ($availableSeats <= 0) {
            return;
        }

        // Get oldest waitlisted enrollments up to available seats
        $waitlistedEnrolments = Enrolment::where('cohort_course_id', $cohortCourse->id)
            ->where('status', EnrolmentStatus::Waitlisted)
            ->orderBy('created_at', 'asc')
            ->limit($availableSeats)
            ->lockForUpdate()
            ->get();

        foreach ($waitlistedEnrolments as $enrolment) {
            $this->enrolmentService->promoteFromWaitlist($enrolment, $cohortCourse);
        }
    }
}
