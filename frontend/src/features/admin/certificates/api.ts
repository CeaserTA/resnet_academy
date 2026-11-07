import { apiClient } from '@/lib/api/client';
import type { AdminCertificate, CertificateStatus, PaginatedResponse } from '@/lib/api/types';

export interface AdminCertificateFilters {
    search?: string;
    course_id?: number;
    cohort_id?: number;
    status?: CertificateStatus;
    page?: number;
}

export async function fetchAdminCertificates(filters: AdminCertificateFilters): Promise<PaginatedResponse<AdminCertificate>> {
    const { data } = await apiClient.get<PaginatedResponse<AdminCertificate>>('/admin/certificates', { params: filters });
    return data;
}

export async function regenerateCertificate(certificateId: number): Promise<AdminCertificate> {
    const { data } = await apiClient.post<{ data: AdminCertificate }>(`/admin/certificates/${certificateId}/regenerate`);
    return data.data;
}

/** Withhold a certificate from its student; the reason is shown to them. */
export async function revokeCertificate(certificateId: number, reason: string): Promise<AdminCertificate> {
    const { data } = await apiClient.post<{ data: AdminCertificate }>(`/admin/certificates/${certificateId}/revoke`, { reason });
    return data.data;
}

export async function restoreCertificate(certificateId: number): Promise<AdminCertificate> {
    const { data } = await apiClient.post<{ data: AdminCertificate }>(`/admin/certificates/${certificateId}/restore`);
    return data.data;
}
