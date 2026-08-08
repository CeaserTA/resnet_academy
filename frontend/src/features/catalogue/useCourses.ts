import { useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchCourse, fetchCourses, fetchCourseModules, type CourseFilters } from '@/features/catalogue/api';

export function useCourses(filters: CourseFilters) {
    return useQuery({
        queryKey: ['courses', filters],
        queryFn: () => fetchCourses(filters),
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
