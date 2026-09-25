<?php

declare(strict_types=1);

namespace App\Services\Content;

use App\Enums\EnrolmentStatus;
use App\Models\Enrolment;
use App\Models\ResourceLiveSession;
use App\Models\User;

/**
 * Who a live session is for. A session tied to a cohort (`resource_live_sessions.cohort_id`)
 * belongs to that intake's students only, so everything a student sees or is held to has to
 * agree on the same answer: the module listing, direct access to the session, joining it,
 * whether it counts toward completing the module, and who is on its attendance list. This is
 * the one place that answer is worked out.
 *
 * A session with no cohort is for everyone taking the course, exactly as before cohorts could
 * be attached to sessions.
 */
final class LiveSessionAudience
{
    /**
     * The cohort a student takes this course in, or null when they have no cohort-based
     * enrolment (a legacy or self-paced enrolment). Such a student is only in the audience of
     * sessions that are not tied to any cohort.
     */
    public function cohortIdFor(User $student, int $courseId): ?int
    {
        $enrolment = Enrolment::query()
            ->where('student_id', $student->id)
            ->where('course_id', $courseId)
            ->where('status', EnrolmentStatus::Confirmed)
            ->with('cohortCourse')
            ->first();

        return $enrolment?->cohortCourse?->cohort_id;
    }

    public function includes(User $student, ResourceLiveSession $session, int $courseId): bool
    {
        return $session->isForCohort($this->cohortIdFor($student, $courseId));
    }

    /**
     * Of the given resource ids, the live sessions this student is not in the audience of.
     * Resources that are not live sessions never appear here.
     *
     * @param  iterable<int, int>  $resourceIds
     * @return array<int, int>
     */
    public function hiddenResourceIds(User $student, int $courseId, iterable $resourceIds): array
    {
        $ids = collect($resourceIds)->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $cohortSessions = ResourceLiveSession::query()
            ->whereIn('resource_id', $ids)
            ->whereNotNull('cohort_id')
            ->get(['resource_id', 'cohort_id']);

        if ($cohortSessions->isEmpty()) {
            return [];
        }

        $studentCohortId = $this->cohortIdFor($student, $courseId);

        return $cohortSessions
            ->reject(fn (ResourceLiveSession $session): bool => $session->cohort_id === $studentCohortId)
            ->pluck('resource_id')
            ->map(fn ($id): int => (int) $id)
            ->values()
            ->all();
    }
}
