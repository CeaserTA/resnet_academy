import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '@/features/admin/dashboard/api';

export function useDashboardSummary() {
    return useQuery({
        queryKey: ['admin', 'dashboard-summary'],
        queryFn: fetchDashboardSummary,
    });
}
