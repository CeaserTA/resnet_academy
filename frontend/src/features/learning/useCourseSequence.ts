import { useMemo } from 'react';
import { useModules } from '@/features/courseStructure/useCourseStructure';
import { flattenModuleItems } from '@/lib/courseSequence';

/**
 * Course-wide ordered item list for pages that only know a courseId (the resource viewer, each
 * dashboard course card) — `CoursePlayerPage` already loads `modules.data` itself via
 * `useCoursePlayer` and calls `flattenModuleItems` directly instead of using this, to avoid a
 * redundant second `useModules` call on the same page.
 */
export function useCourseSequence(courseId: number) {
    const { data: modules, isLoading } = useModules(courseId);

    const flatItems = useMemo(() => flattenModuleItems(modules ?? []), [modules]);

    return { flatItems, isLoading };
}
