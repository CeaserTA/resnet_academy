import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, fetchCourseAnalytics } from '@/features/analytics/api';

export function useCourseAnalytics(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'analytics'],
        queryFn: () => fetchCourseAnalytics(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useAuditLogs(filters: { entity_type?: string; action?: string; page?: number }) {
    return useQuery({
        queryKey: ['admin', 'audit-logs', filters],
        queryFn: () => fetchAuditLogs(filters),
    });
}
