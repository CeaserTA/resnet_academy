import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    approveCourseApplication,
    dismissCourseApplication,
    fetchCourseApplications,
    fetchMyCourseApplications,
    rejectCourseApplication,
    submitCourseApplication,
} from '@/features/courseApplications/api';
import type { CourseApplication } from '@/lib/api/types';

const ADMIN_QUERY_KEY = ['admin', 'course-applications'];
const MINE_QUERY_KEY = ['course-applications', 'me'];

export function useCourseApplications(params: { status?: string; page?: number } = {}) {
    return useQuery({
        queryKey: [...ADMIN_QUERY_KEY, params.status ?? null, params.page ?? 1],
        queryFn: () => fetchCourseApplications(params),
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
        mutationFn: ({
            id,
            recommendedCourseIds,
            rejectionReason,
        }: {
            id: number;
            recommendedCourseIds?: number[];
            rejectionReason?: string;
        }) => rejectCourseApplication(id, recommendedCourseIds, rejectionReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}

/**
 * Removes the dismissed card from the dashboard immediately (optimistic), rolling back only if
 * the request actually fails — no confirmation dialog, this is meant to feel instant.
 */
export function useDismissCourseApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: dismissCourseApplication,
        onMutate: async (id: number) => {
            await queryClient.cancelQueries({ queryKey: MINE_QUERY_KEY });
            const previous = queryClient.getQueryData<CourseApplication[]>(MINE_QUERY_KEY);

            queryClient.setQueryData<CourseApplication[]>(MINE_QUERY_KEY, (current) =>
                current?.filter((application) => application.id !== id),
            );

            return { previous };
        },
        onError: (_error, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(MINE_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: MINE_QUERY_KEY });
        },
    });
}
