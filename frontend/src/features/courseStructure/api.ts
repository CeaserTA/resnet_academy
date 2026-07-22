import { apiClient } from '@/lib/api/client';
import type { Group, Module, ResourceItem } from '@/lib/api/types';

export interface ModulePayload {
    title: string;
    description?: string;
    order_index?: number;
    scheduled_start_at?: string | null;
    group_ids?: number[];
}

export async function fetchModules(courseId: number): Promise<Module[]> {
    const { data } = await apiClient.get<{ data: Module[] }>(`/courses/${courseId}/modules`);
    return data.data;
}

export async function createModule(courseId: number, payload: ModulePayload): Promise<Module> {
    const { data } = await apiClient.post<{ data: Module }>(`/courses/${courseId}/modules`, payload);
    return data.data;
}

export async function updateModule(moduleId: number, payload: Partial<ModulePayload>): Promise<Module> {
    const { data } = await apiClient.patch<{ data: Module }>(`/modules/${moduleId}`, payload);
    return data.data;
}

export async function deleteModule(moduleId: number): Promise<void> {
    await apiClient.delete(`/modules/${moduleId}`);
}

export interface GroupPayload {
    name: string;
    description?: string;
}

export async function fetchGroups(courseId: number): Promise<Group[]> {
    const { data } = await apiClient.get<{ data: Group[] }>(`/courses/${courseId}/groups`);
    return data.data;
}

export async function createGroup(courseId: number, payload: GroupPayload): Promise<Group> {
    const { data } = await apiClient.post<{ data: Group }>(`/courses/${courseId}/groups`, payload);
    return data.data;
}

export async function deleteGroup(groupId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
}

export async function addGroupMember(groupId: number, studentId: number): Promise<Group> {
    const { data } = await apiClient.post<{ data: Group }>(`/groups/${groupId}/members`, { student_id: studentId });
    return data.data;
}

export async function removeGroupMember(groupId: number, studentId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members/${studentId}`);
}

/**
 * One payload shape for all 7 resource types — mirrors StoreResourceRequest on the backend,
 * only the fields for the selected `type` are actually required there.
 */
export interface ResourcePayload {
    type: string;
    title: string;
    description?: string;
    is_required?: boolean;
    order_index?: number;
    [key: string]: unknown;
}

export async function createResource(moduleId: number, payload: ResourcePayload): Promise<ResourceItem> {
    const { data } = await apiClient.post<{ data: ResourceItem }>(`/modules/${moduleId}/resources`, payload);
    return data.data;
}

export async function updateResource(resourceId: number, payload: Partial<ResourcePayload>): Promise<ResourceItem> {
    const { data } = await apiClient.patch<{ data: ResourceItem }>(`/resources/${resourceId}`, payload);
    return data.data;
}

export async function deleteResource(resourceId: number): Promise<void> {
    await apiClient.delete(`/resources/${resourceId}`);
}
