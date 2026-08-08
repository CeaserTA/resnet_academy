import { apiClient } from '@/lib/api/client';
import type { CourseReview } from '@/lib/api/types';

export async function fetchMyReviews(): Promise<CourseReview[]> {
    const { data } = await apiClient.get<{ data: CourseReview[] }>('/me/reviews');
    return data.data;
}

export async function fetchFeaturedReviews(limit = 6): Promise<CourseReview[]> {
    const { data } = await apiClient.get<{ data: CourseReview[] }>('/reviews', {
        params: { featured: 1, per_page: limit },
    });
    return data.data;
}

export async function submitCourseReview(
    courseId: number,
    payload: { rating: number; review_text?: string },
): Promise<CourseReview> {
    const { data } = await apiClient.post<{ data: CourseReview }>(`/courses/${courseId}/reviews`, payload);
    return data.data;
}

export async function fetchAdminReviews(status?: string): Promise<CourseReview[]> {
    const { data } = await apiClient.get<{ data: CourseReview[] }>('/admin/reviews', {
        params: status ? { status } : undefined,
    });
    return data.data;
}

export async function approveCourseReview(id: number): Promise<CourseReview> {
    const { data } = await apiClient.post<{ data: CourseReview }>(`/admin/reviews/${id}/approve`);
    return data.data;
}

export async function rejectCourseReview(id: number, adminNotes?: string): Promise<CourseReview> {
    const { data } = await apiClient.post<{ data: CourseReview }>(`/admin/reviews/${id}/reject`, {
        admin_notes: adminNotes,
    });
    return data.data;
}

export async function setCourseReviewFeatured(id: number, isFeatured: boolean): Promise<CourseReview> {
    const { data } = await apiClient.post<{ data: CourseReview }>(`/admin/reviews/${id}/feature`, {
        is_featured: isFeatured,
    });
    return data.data;
}
