import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    approveCourseReview,
    fetchAdminReviews,
    fetchFeaturedReviews,
    fetchMyReviews,
    rejectCourseReview,
    setCourseReviewFeatured,
    submitCourseReview,
} from '@/features/reviews/api';

const ADMIN_QUERY_KEY = ['admin', 'reviews'];
const MINE_QUERY_KEY = ['reviews', 'me'];
const FEATURED_QUERY_KEY = ['reviews', 'featured'];

export function useMyReviews(enabled = true) {
    return useQuery({
        queryKey: MINE_QUERY_KEY,
        queryFn: fetchMyReviews,
        enabled,
    });
}

export function useFeaturedReviews(limit = 6) {
    return useQuery({
        queryKey: [...FEATURED_QUERY_KEY, limit],
        queryFn: () => fetchFeaturedReviews(limit),
    });
}

export function useSubmitCourseReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ courseId, rating, reviewText }: { courseId: number; rating: number; reviewText?: string }) =>
            submitCourseReview(courseId, { rating, review_text: reviewText }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MINE_QUERY_KEY });
        },
    });
}

export function useAdminReviews(status?: string) {
    return useQuery({
        queryKey: [...ADMIN_QUERY_KEY, status],
        queryFn: () => fetchAdminReviews(status),
    });
}

export function useApproveCourseReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: approveCourseReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}

export function useRejectCourseReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, adminNotes }: { id: number; adminNotes?: string }) => rejectCourseReview(id, adminNotes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}

export function useSetCourseReviewFeatured() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isFeatured }: { id: number; isFeatured: boolean }) => setCourseReviewFeatured(id, isFeatured),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
        },
    });
}
