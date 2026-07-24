import { apiClient } from '@/lib/api/client';
import { postFormData, toFormData, type FormDataValue } from '@/lib/api/formData';
import type { Module, ResourceItem } from '@/lib/api/types';

export interface ModulePayload {
    title: string;
    description?: string;
    order_index?: number;
    scheduled_start_at?: string | null;
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

/**
 * `file`/`package` land in the payload as real `File` objects when the resource form's upload
 * picker was used (document/downloadable_file/scorm types) — everything else stays plain JSON.
 */
function hasFileField(payload: Record<string, unknown>): boolean {
    return Object.values(payload).some((value) => value instanceof File);
}

export async function createResource(moduleId: number, payload: ResourcePayload): Promise<ResourceItem> {
    if (hasFileField(payload)) {
        const response = await postFormData<{ data: ResourceItem }>(
            `/modules/${moduleId}/resources`,
            toFormData(payload as Record<string, FormDataValue>),
        );
        return response.data;
    }

    const { data } = await apiClient.post<{ data: ResourceItem }>(`/modules/${moduleId}/resources`, payload);
    return data.data;
}

export async function updateResource(resourceId: number, payload: Partial<ResourcePayload>): Promise<ResourceItem> {
    if (hasFileField(payload)) {
        const response = await postFormData<{ data: ResourceItem }>(
            `/resources/${resourceId}`,
            toFormData(payload as Record<string, FormDataValue>),
            'PATCH',
        );
        return response.data;
    }

    const { data } = await apiClient.patch<{ data: ResourceItem }>(`/resources/${resourceId}`, payload);
    return data.data;
}

export async function deleteResource(resourceId: number): Promise<void> {
    await apiClient.delete(`/resources/${resourceId}`);
}
