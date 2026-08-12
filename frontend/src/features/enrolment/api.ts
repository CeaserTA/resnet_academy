import { apiClient } from '@/lib/api/client';
import type { Enrolment, PaginatedResponse, PaymentSubmission } from '@/lib/api/types';

export async function fetchMyEnrolments(page = 1): Promise<PaginatedResponse<Enrolment>> {
    const { data } = await apiClient.get<PaginatedResponse<Enrolment>>('/enrolments', { params: { page } });
    return data;
}

export async function enrolInCourse(courseId: number, sectionId?: number): Promise<Enrolment> {
    const { data } = await apiClient.post<{ data: Enrolment }>('/enrolments', {
        course_id: courseId,
        ...(sectionId !== undefined ? { section_id: sectionId } : {}),
    });
    return data.data;
}

export async function withdrawEnrolment(enrolmentId: number): Promise<Enrolment> {
    const { data } = await apiClient.post<{ data: Enrolment }>(`/enrolments/${enrolmentId}/withdraw`);
    return data.data;
}

export async function submitPayment(orderId: number, amount: number, receipt: File): Promise<PaymentSubmission> {
    const formData = new FormData();
    formData.append('amount', String(amount));
    formData.append('receipt', receipt);

    const { data } = await apiClient.post<{ data: PaymentSubmission }>(
        `/orders/${orderId}/payment-submissions`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
}
