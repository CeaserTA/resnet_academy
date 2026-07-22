import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCourse, deleteCourse, updateCourse, type CoursePayload } from '@/features/admin/courses/api';

export function useCreateCourse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CoursePayload) => createCourse(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
    });
}

export function useUpdateCourse(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: Partial<CoursePayload>) => updateCourse(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
    });
}

export function useDeleteCourse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteCourse(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
    });
}
