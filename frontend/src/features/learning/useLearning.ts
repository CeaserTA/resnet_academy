import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useModules } from '@/features/courseStructure/useCourseStructure';
import {
    fetchCourseProgress,
    fetchResource,
    markAttendance,
    markOpened,
    markRead,
    recordVideoProgress,
} from '@/features/learning/api';

export function useResource(resourceId: number) {
    return useQuery({
        queryKey: ['resources', resourceId],
        queryFn: () => fetchResource(resourceId),
        enabled: Number.isFinite(resourceId),
    });
}

export function useCourseProgress(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'progress'],
        queryFn: () => fetchCourseProgress(courseId),
        enabled: Number.isFinite(courseId),
    });
}

/**
 * The module list itself (with each resource's is_complete) plus the roll-up progress list —
 * the player screen needs both to know what's unlocked and what's already done.
 */
export function useCoursePlayer(courseId: number) {
    const modules = useModules(courseId);
    const progress = useCourseProgress(courseId);

    return { modules, progress };
}

function useInvalidateProgress(courseId: number) {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'progress'] });
        queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] });
    };
}

export function useRecordVideoProgress(courseId: number) {
    const invalidate = useInvalidateProgress(courseId);

    return useMutation({
        mutationFn: ({ resourceId, positionSeconds }: { resourceId: number; positionSeconds: number }) =>
            recordVideoProgress(resourceId, positionSeconds),
        onSuccess: invalidate,
    });
}

export function useMarkRead(courseId: number) {
    const invalidate = useInvalidateProgress(courseId);

    return useMutation({
        mutationFn: (resourceId: number) => markRead(resourceId),
        onSuccess: invalidate,
    });
}

export function useMarkOpened(courseId: number) {
    const invalidate = useInvalidateProgress(courseId);

    return useMutation({
        mutationFn: (resourceId: number) => markOpened(resourceId),
        onSuccess: invalidate,
    });
}

export function useMarkAttendance(courseId: number) {
    const invalidate = useInvalidateProgress(courseId);

    return useMutation({
        mutationFn: (resourceId: number) => markAttendance(resourceId),
        onSuccess: invalidate,
    });
}
