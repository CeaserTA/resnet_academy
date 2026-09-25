import { useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchCourse, fetchCourses, fetchCourseModules, type CourseFilters } from '@/features/catalogue/api';

export function useCourses(filters: CourseFilters) {
    return useQuery({
        queryKey: ['courses', filters],
        queryFn: () => fetchCourses(filters),
    });
}

/**
 * Every course matching `filters`, across all pages. `/courses` pages at 15 and has no text
 * search, so screens that list/search the whole set client-side need the full list — `useCourses`
 * alone silently stops at the first 15.
 */
export function useAllCourses(filters: Omit<CourseFilters, 'page'> = {}) {
    return useQuery({
        queryKey: ['courses', 'all', filters],
        queryFn: async () => {
            const first = await fetchCourses({ ...filters, page: 1 });
            const rest = await Promise.all(
                Array.from({ length: first.meta.last_page - 1 }, (_, i) => fetchCourses({ ...filters, page: i + 2 })),
            );
            return [first, ...rest].flatMap((page) => page.data);
        },
    });
}

export function useCourse(id: number) {
    return useQuery({
        queryKey: ['courses', id],
        queryFn: () => fetchCourse(id),
        enabled: Number.isFinite(id),
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCourseModules(courseId: number | null) {
    return useQuery({
        queryKey: ['course-modules', courseId],
        queryFn: () => fetchCourseModules(courseId!),
        enabled: courseId !== null,
        staleTime: 5 * 60 * 1000,
    });
}
