import { apiClient } from '@/lib/api/client';
import type { DashboardSummary } from '@/lib/api/types';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<{ data: DashboardSummary }>('/admin/dashboard-summary');
    return data.data;
}
