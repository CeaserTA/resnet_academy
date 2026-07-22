import { apiClient } from '@/lib/api/client';
import type { AuditLogEntry, CourseAnalytics, PaginatedResponse } from '@/lib/api/types';

export async function fetchCourseAnalytics(courseId: number): Promise<CourseAnalytics> {
    const { data } = await apiClient.get<{ data: CourseAnalytics }>(`/courses/${courseId}/analytics`);
    return data.data;
}

export async function fetchAuditLogs(filters: {
    entity_type?: string;
    entity_id?: number;
    action?: string;
    page?: number;
}): Promise<PaginatedResponse<AuditLogEntry>> {
    const { data } = await apiClient.get<PaginatedResponse<AuditLogEntry>>('/admin/audit-logs', { params: filters });
    return data;
}
