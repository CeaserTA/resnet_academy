<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseApplicationStatus;
use App\Enums\EnrolmentStatus;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Business logic for managing course sections (cohorts).
 * Handles capacity changes with automatic waitlist promotion.
 */
final class CourseSectionService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly EnrolmentService $enrolmentService,
    ) {}

    /**
     * Create a new course section.
     */
    public function create(int $courseId, array $data, int $actorId): CourseSection
    {
        $section = CourseSection::create([
            ...$data,
            'course_id' => $courseId,
            'seats_taken' => 0,
        ]);

        $this->auditLogger->log(
            action: 'course_section.created',
            entityType: 'course_section',
            entityId: $section->id,
            actorId: $actorId,
            meta: ['course_id' => $courseId, 'name' => $section->name],
        );

        return $section;
    }

    /**
     * Update a course section.
     * 
     * If capacity is increased and waitlisted students exist, automatically promote
     * oldest waitlisted students until capacity is reached or waitlist is empty.
     */
    public function update(CourseSection $section, array $data, int $actorId): CourseSection
    {
        return DB::transaction(function () use ($section, $data, $actorId) {
            $oldCapacity = $section->capacity;
            $newCapacity = $data['capacity'] ?? $oldCapacity;

            // Validate capacity decrease
            if ($newCapacity !== null && $oldCapacity !== null && $newCapacity < $oldCapacity) {
                if ($newCapacity < $section->seats_taken) {
                    throw ValidationException::withMessages([
                        'capacity' => 'Cannot reduce capacity below current enrollment count (' . $section->seats_taken . ').',
                    ]);
                }
            }

            $section->update($data);

            $this->auditLogger->log(
                action: 'course_section.updated',
                entityType: 'course_section',
                entityId: $section->id,
                actorId: $actorId,
                meta: [
                    'course_id' => $section->course_id,
                    'changes' => array_keys($data),
                ],
            );

            // Handle capacity increase - promote waitlisted students
            if ($newCapacity !== null && ($oldCapacity === null || $newCapacity > $oldCapacity)) {
                $this->promoteWaitlistedStudents($section);
            }

            return $section->fresh();
        });
    }

    /**
     * Delete a course section.
     * Only allowed if section has no enrollments (including withdrawn) or applications.
     * Deletion is for untouched draft sections only - use "Closed" status for sections with history.
     */
    public function delete(CourseSection $section, int $actorId): void
    {
        // Check for any enrollments at all (including withdrawn - section has history)
        $hasAnyEnrollments = $section->enrolments()->exists();

        if ($hasAnyEnrollments) {
            throw ValidationException::withMessages([
                'section' => 'Cannot delete section with enrollment history. Use the "Closed" status instead.',
            ]);
        }

        // Check for any applications (including rejected/dismissed - section has history)
        $hasAnyApplications = $section->applications()->exists();

        if ($hasAnyApplications) {
            throw ValidationException::withMessages([
                'section' => 'Cannot delete section with application history. Use the "Closed" status instead.',
            ]);
        }

        $this->auditLogger->log(
            action: 'course_section.deleted',
            entityType: 'course_section',
            entityId: $section->id,
            actorId: $actorId,
            meta: [
                'course_id' => $section->course_id,
                'name' => $section->name,
            ],
        );

        $section->delete();
    }

    /**
     * Promote waitlisted students when capacity increases.
     * Calls EnrolmentService::promoteFromWaitlist() for each student.
     */
    private function promoteWaitlistedStudents(CourseSection $section): void
    {
        $section = CourseSection::where('id', $section->id)->lockForUpdate()->first();

        if ($section === null) {
            return;
        }

        // Calculate available seats
        $availableSeats = $section->capacity !== null
            ? $section->capacity - $section->seats_taken
            : PHP_INT_MAX;

        if ($availableSeats <= 0) {
            return;
        }

        // Get oldest waitlisted enrollments up to available seats
        $waitlistedEnrolments = Enrolment::where('section_id', $section->id)
            ->where('status', EnrolmentStatus::Waitlisted)
            ->orderBy('created_at', 'asc')
            ->limit($availableSeats)
            ->lockForUpdate()
            ->get();

        foreach ($waitlistedEnrolments as $enrolment) {
            $this->enrolmentService->promoteFromWaitlist($enrolment, $section);
        }
    }
}
