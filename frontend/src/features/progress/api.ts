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

/**
 * A plain browser-navigable URL rather than an axios call — the endpoint redirects to the PDF,
 * so it has to be followed by the browser. Sanctum's session cookie rides along on the
 * top-level navigation, which is what authenticates it.
 */
export function certificateDownloadUrl(certificateId: number): string {
    return `${import.meta.env.VITE_API_BASE_URL as string}/api/v1/certificates/${certificateId}/download`;
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
