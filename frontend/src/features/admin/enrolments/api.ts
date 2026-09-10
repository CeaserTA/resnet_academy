import { apiClient } from '@/lib/api/client';
import type { AdminEnrolment, EnrolmentSource, EnrolmentStatus, PaginatedResponse } from '@/lib/api/types';

export async function importEnrolmentsCsv(cohortCourseId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('cohort_course_id', String(cohortCourseId));
    formData.append('file', file);

    await apiClient.post('/enrolments/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export interface AdminEnrolmentFilters {
    course_id?: number;
    status?: EnrolmentStatus;
    source?: EnrolmentSource;
    search?: string;
    page?: number;
}

export async function fetchAdminEnrolments(filters: AdminEnrolmentFilters): Promise<PaginatedResponse<AdminEnrolment>> {
    const { data } = await apiClient.get<PaginatedResponse<AdminEnrolment>>('/admin/enrolments', {
        params: filters,
    });
    return data;
}

export async function updateEnrolmentStatus(enrolmentId: number, status: EnrolmentStatus): Promise<AdminEnrolment> {
    const { data } = await apiClient.patch<{ data: AdminEnrolment }>(`/admin/enrolments/${enrolmentId}/status`, { status });
    return data.data;
}

export async function getTransferRequests(): Promise<AdminEnrolment[]> {
    const { data } = await apiClient.get<{ data: AdminEnrolment[] }>('/admin/enrolments/transfer-requests');
    return data.data;
}

export async function transferEnrolment(
    enrolmentId: number,
    payload: { course_id: number; cohort_course_id: number; note?: string }
): Promise<AdminEnrolment> {
    const { data } = await apiClient.post<{ data: AdminEnrolment }>(`/admin/enrolments/${enrolmentId}/transfer`, payload);
    return data.data;
}

export async function refundEnrolment(
    enrolmentId: number,
    payload: { refund_amount: number; note?: string }
): Promise<AdminEnrolment> {
    const { data } = await apiClient.post<{ data: AdminEnrolment }>(`/admin/enrolments/${enrolmentId}/refund`, payload);
    return data.data;
}
