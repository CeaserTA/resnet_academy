import { useCohortCoursesForCourse } from '@/features/cohorts/useCohorts';
import type { CohortCourse, CohortCourseStatus } from '@/lib/api/types';

// Statuses a student can enroll into (open or actively running)
const ENROLLABLE_STATUSES: CohortCourseStatus[] = [
    'open',
    'in_progress',
];

export interface UseStudentSectionsResult {
    /** Every cohort offering of this course (unfiltered). */
    sections: CohortCourse[];
    /** Only open/in_progress offerings — drives the picker display and CTA gating. */
    openSections: CohortCourse[];
    isLoading: boolean;
    isError: boolean;
}

/**
 * Student-facing read-only wrapper around useCohortCoursesForCourse — every enrolment now
 * belongs to a specific cohort offering, so there is no self-paced fallback to gate on.
 *
 * `openSections` filters to status open|in_progress only.
 * Full offerings (is_full: true) are intentionally included — selecting them triggers
 * a waitlist enrollment on the backend, which is the correct behavior.
 */
export function useStudentSections(courseId: number): UseStudentSectionsResult {
    const { data: sections = [], isLoading, isError } = useCohortCoursesForCourse(courseId);

    const openSections = sections.filter((s) =>
        ENROLLABLE_STATUSES.includes(s.status),
    );

    return { sections, openSections, isLoading, isError };
}
