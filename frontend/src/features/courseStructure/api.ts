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

export async function fetchTrashedModules(courseId: number): Promise<Module[]> {
    const { data } = await apiClient.get<{ data: Module[] }>(`/courses/${courseId}/modules/trashed`);
    return data.data;
}

export async function restoreModule(moduleId: number): Promise<Module> {
    const { data } = await apiClient.post<{ data: Module }>(`/modules/${moduleId}/restore`);
    return data.data;
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

/**
 * The API answers a resource save with the saved resource plus, when a recording link was set
 * and looks unreachable, a warning. The save still succeeded — the warning is advice about a
 * link students probably cannot open, not a failure.
 */
interface ResourceSaveResponse {
    data: ResourceItem;
    recording_link_warning?: string | null;
}

export interface ResourceSaveResult {
    resource: ResourceItem;
    recordingLinkWarning: string | null;
}

export async function createResource(moduleId: number, payload: ResourcePayload): Promise<ResourceSaveResult> {
    if (hasFileField(payload)) {
        const response = await postFormData<ResourceSaveResponse>(
            `/modules/${moduleId}/resources`,
            toFormData(payload as Record<string, FormDataValue>),
        );
        return { resource: response.data, recordingLinkWarning: response.recording_link_warning ?? null };
    }

    const { data } = await apiClient.post<ResourceSaveResponse>(`/modules/${moduleId}/resources`, payload);
    return { resource: data.data, recordingLinkWarning: data.recording_link_warning ?? null };
}

export async function updateResource(resourceId: number, payload: Partial<ResourcePayload>): Promise<ResourceSaveResult> {
    if (hasFileField(payload)) {
        const response = await postFormData<ResourceSaveResponse>(
            `/resources/${resourceId}`,
            toFormData(payload as Record<string, FormDataValue>),
            'PATCH',
        );
        return { resource: response.data, recordingLinkWarning: response.recording_link_warning ?? null };
    }

    const { data } = await apiClient.patch<ResourceSaveResponse>(`/resources/${resourceId}`, payload);
    return { resource: data.data, recordingLinkWarning: data.recording_link_warning ?? null };
}

export async function deleteResource(resourceId: number): Promise<void> {
    await apiClient.delete(`/resources/${resourceId}`);
}
