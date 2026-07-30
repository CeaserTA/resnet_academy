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

        if (value instanceof File) {
            formData.append(key, value);
            continue;
        }

        // Laravel's `boolean` validation rule accepts 1/0/"1"/"0"/true/false — NOT the literal
        // strings "true"/"false" that `String(true)` would produce, which multipart form fields
        // always arrive as server-side. Without this, any boolean field sent through a
        // multipart (file-upload) request fails validation even though the value is correct.
        if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
            continue;
        }

        formData.append(key, String(value));
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
