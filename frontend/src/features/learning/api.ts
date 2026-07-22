import { apiClient } from '@/lib/api/client';
import type { ModuleProgressEntry, ResourceItem } from '@/lib/api/types';

export async function fetchCourseProgress(courseId: number): Promise<ModuleProgressEntry[]> {
    const { data } = await apiClient.get<{ data: ModuleProgressEntry[] }>(`/courses/${courseId}/progress`);
    return data.data;
}

export async function fetchResource(resourceId: number): Promise<ResourceItem> {
    const { data } = await apiClient.get<{ data: ResourceItem }>(`/resources/${resourceId}`);
    return data.data;
}

export async function recordVideoProgress(resourceId: number, positionSeconds: number): Promise<void> {
    await apiClient.post(`/resources/${resourceId}/progress/watch`, { position_seconds: positionSeconds });
}

export async function markRead(resourceId: number): Promise<void> {
    await apiClient.post(`/resources/${resourceId}/progress/mark-read`);
}

export async function markOpened(resourceId: number): Promise<void> {
    await apiClient.post(`/resources/${resourceId}/progress/mark-opened`);
}

export async function markAttendance(resourceId: number): Promise<void> {
    await apiClient.post(`/resources/${resourceId}/progress/attendance`);
}
