import { useSections } from '@/features/sections/useSections';
import { CourseSectionStatus } from '@/features/sections/types';
import type { CourseSection } from '@/features/sections/types';

// Statuses a student can enroll into (open or actively running)
const ENROLLABLE_STATUSES: CourseSectionStatus[] = [
    'open',
    'in_progress',
];

export interface UseStudentSectionsResult {
    /** All sections for the course (unfiltered). */
    sections: CourseSection[];
    /** Only open/in_progress sections — drives the picker display and CTA gating. */
    openSections: CourseSection[];
    isLoading: boolean;
    isError: boolean;
}

/**
 * Student-facing read-only wrapper around useSections.
 * Re-uses the exact same query key and fetch function as the admin feature — no duplicate logic.
 *
 * `openSections` filters to status open|in_progress only.
 * Full sections (is_full: true) are intentionally included — selecting them triggers
 * a waitlist enrollment on the backend, which is the correct behavior.
 */
export function useStudentSections(courseId: number): UseStudentSectionsResult {
    const { data: sections = [], isLoading, isError } = useSections(courseId);

    const openSections = sections.filter((s) =>
        ENROLLABLE_STATUSES.includes(s.status),
    );

    return { sections, openSections, isLoading, isError };
}
