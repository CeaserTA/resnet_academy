import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createModule,
    createResource,
    deleteModule,
    deleteResource,
    fetchModules,
    updateModule,
    updateResource,
    type ModulePayload,
    type ResourcePayload,
} from '@/features/courseStructure/api';

export function useModules(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'modules'],
        queryFn: () => fetchModules(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useCreateModule(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ModulePayload) => createModule(courseId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useUpdateModule(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleId, payload }: { moduleId: number; payload: Partial<ModulePayload> }) =>
            updateModule(moduleId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useDeleteModule(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (moduleId: number) => deleteModule(moduleId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useCreateResource(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleId, payload }: { moduleId: number; payload: ResourcePayload }) =>
            createResource(moduleId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useUpdateResource(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ resourceId, payload }: { resourceId: number; payload: Partial<ResourcePayload> }) =>
            updateResource(resourceId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useDeleteResource(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (resourceId: number) => deleteResource(resourceId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}
