import { apiClient } from '@/lib/api/client';
import type { CourseApplication } from '@/lib/api/types';

export async function fetchCourseApplications(status?: string): Promise<CourseApplication[]> {
    const { data } = await apiClient.get<{ data: CourseApplication[] }>('/course-applications', {
        params: status ? { status } : undefined,
    });
    return data.data;
}

export async function fetchMyCourseApplications(): Promise<CourseApplication[]> {
    const { data } = await apiClient.get<{ data: CourseApplication[] }>('/course-applications/me');
    return data.data;
}

export async function submitCourseApplication(payload: {
    course_id: number;
    section_id?: number;
    answers?: string[];
    portfolio_url?: string;
    alternative_proof_text?: string;
}): Promise<CourseApplication> {
    const { data } = await apiClient.post<{ data: CourseApplication }>('/course-applications', payload);
    return data.data;
}

export async function approveCourseApplication(id: number): Promise<CourseApplication> {
    const { data } = await apiClient.post<{ data: CourseApplication }>(`/course-applications/${id}/approve`);
    return data.data;
}

export async function rejectCourseApplication(
    id: number,
    recommendedCourseIds: number[] = [],
    rejectionReason?: string,
): Promise<CourseApplication> {
    const { data } = await apiClient.post<{ data: CourseApplication }>(`/course-applications/${id}/reject`, {
        recommended_course_ids: recommendedCourseIds,
        rejection_reason: rejectionReason,
    });
    return data.data;
}

export async function dismissCourseApplication(id: number): Promise<CourseApplication> {
    const { data } = await apiClient.post<{ data: CourseApplication }>(`/course-applications/${id}/dismiss`);
    return data.data;
}
