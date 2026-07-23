import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, fetchCourseAnalytics, notifyAtRiskStudents } from '@/features/analytics/api';

export function useCourseAnalytics(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'analytics'],
        queryFn: () => fetchCourseAnalytics(courseId),
        enabled: Number.isFinite(courseId),
    });
}

/**
 * "Send Mass Notice" — fire-and-confirm; nothing on the page reads back from this beyond the
 * mutation's own returned count, so there's nothing to invalidate.
 */
export function useNotifyAtRiskStudents(courseId: number) {
    return useMutation({
        mutationFn: (message?: string) => notifyAtRiskStudents(courseId, message),
    });
}

export function useAuditLogs(filters: { entity_type?: string; action?: string; page?: number }) {
    return useQuery({
        queryKey: ['admin', 'audit-logs', filters],
        queryFn: () => fetchAuditLogs(filters),
    });
}
