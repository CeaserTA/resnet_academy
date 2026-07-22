import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addGroupMember,
    createGroup,
    createModule,
    createResource,
    deleteGroup,
    deleteModule,
    deleteResource,
    fetchGroups,
    fetchModules,
    removeGroupMember,
    updateModule,
    updateResource,
    type GroupPayload,
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

export function useGroups(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'groups'],
        queryFn: () => fetchGroups(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useCreateGroup(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: GroupPayload) => createGroup(courseId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'groups'] }),
    });
}

export function useDeleteGroup(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (groupId: number) => deleteGroup(groupId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'groups'] }),
    });
}

export function useAddGroupMember(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, studentId }: { groupId: number; studentId: number }) =>
            addGroupMember(groupId, studentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'groups'] }),
    });
}

export function useRemoveGroupMember(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, studentId }: { groupId: number; studentId: number }) =>
            removeGroupMember(groupId, studentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'groups'] }),
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
