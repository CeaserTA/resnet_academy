import { apiClient } from '@/lib/api/client';

export type FormDataValue = string | number | boolean | File | null | undefined;

/**
 * Shared multipart-form builder for upload endpoints (avatar, course thumbnail, resource files).
 * `communication/api.ts`'s `buildForumPostFormData` predates this and stays as-is — not
 * refactored here to avoid touching working code — but every upload added after it should use
 * this instead of hand-rolling another one-off `FormData` builder.
 */
export function toFormData(fields: Record<string, FormDataValue>): FormData {
    const formData = new FormData();

    for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined) {
            continue;
        }

        formData.append(key, value instanceof File ? value : String(value));
    }

    return formData;
}

/**
 * Laravel doesn't parse multipart bodies on a real PATCH request — use POST with
 * _method spoofing only for web-middleware routes. For API (Sanctum) routes, send
 * a real PATCH; axios handles multipart/form-data on PATCH correctly.
 */
export async function postFormData<T>(url: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
    const { data } = await apiClient.request<T>({
        method,
        url,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
}
