import { apiClient } from '@/lib/api/client';
import type { Enrolment, PaginatedResponse } from '@/lib/api/types';

export async function fetchMyEnrolments(page = 1): Promise<PaginatedResponse<Enrolment>> {
    const { data } = await apiClient.get<PaginatedResponse<Enrolment>>('/enrolments', { params: { page } });
    return data;
}

export async function enrolInCourse(courseId: number): Promise<Enrolment> {
    const { data } = await apiClient.post<{ data: Enrolment }>('/enrolments', { course_id: courseId });
    return data.data;
}

export async function withdrawEnrolment(enrolmentId: number): Promise<Enrolment> {
    const { data } = await apiClient.post<{ data: Enrolment }>(`/enrolments/${enrolmentId}/withdraw`);
    return data.data;
}
