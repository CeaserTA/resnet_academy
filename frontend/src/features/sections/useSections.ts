import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSection, deleteSection, fetchSections, fetchPublicSections, updateSection, type CreateSectionInput } from './api';

export function useSections(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'sections'],
        queryFn: () => fetchSections(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function usePublicSections() {
    return useQuery({
        queryKey: ['sections', 'public'],
        queryFn: fetchPublicSections,
    });
}

export function useCreateSection(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateSectionInput) => createSection(courseId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'sections'] }),
    });
}

export function useUpdateSection(courseId: number, sectionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: Partial<CreateSectionInput>) => updateSection(sectionId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'sections'] }),
    });
}

export function useDeleteSection(courseId: number, sectionId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => deleteSection(sectionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'sections'] }),
    });
}
