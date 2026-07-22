import { apiClient } from '@/lib/api/client';
import type { AttendanceRosterEntry, Certificate, CertificateVerification, ProgressDashboardRow } from '@/lib/api/types';

export async function fetchProgressDashboard(): Promise<ProgressDashboardRow[]> {
    const { data } = await apiClient.get<{ data: ProgressDashboardRow[] }>('/me/progress');
    return data.data;
}

export async function fetchMyCertificates(): Promise<Certificate[]> {
    const { data } = await apiClient.get<{ data: Certificate[] }>('/certificates');
    return data.data;
}

export async function verifyCertificate(certificateNumber: string): Promise<CertificateVerification> {
    const { data } = await apiClient.get<{ data: CertificateVerification }>(
        `/certificates/verify/${encodeURIComponent(certificateNumber)}`,
    );
    return data.data;
}

export async function fetchAttendanceRoster(resourceId: number): Promise<AttendanceRosterEntry[]> {
    const { data } = await apiClient.get<{ data: AttendanceRosterEntry[] }>(`/resources/${resourceId}/attendance`);
    return data.data;
}
