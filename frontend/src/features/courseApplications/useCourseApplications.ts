import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    approveCourseApplication,
    fetchCourseApplications,
    fetchMyCourseApplications,
    rejectCourseApplication,
    submitCourseApplication,
} from '@/features/courseApplications/api';

const ADMIN_QUERY_KEY = ['admin', 'course-applications'];
const MINE_QUERY_KEY = ['course-applications', 'me'];

export function useCourseApplications(status?: string) {
    return useQuery({
        queryKey: [...ADMIN_QUERY_KEY, status],
        queryFn: () => fetchCourseApplications(status),
    });
}

export function useMyCourseApplications(enabled = true) {
    return useQuery({
        queryKey: MINE_QUERY_KEY,
        queryFn: fetchMyCourseApplications,
        enabled,
    });
}

export function useSubmitCourseApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: submitCourseApplication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MINE_QUERY_KEY });
        },
    });
}

export function useApproveCourseApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: approveCourseApplication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}

export function useRejectCourseApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, recommendedCourseIds }: { id: number; recommendedCourseIds?: number[] }) =>
            rejectCourseApplication(id, recommendedCourseIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}
