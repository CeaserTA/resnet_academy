import { apiClient } from '@/lib/api/client';
import { postFormData, toFormData } from '@/lib/api/formData';
import type { Course } from '@/lib/api/types';

export interface CoursePayload {
    title: string;
    slug?: string;
    category_id?: number;
    description?: string;
    level: string;
    enrolment_policy: string;
    advisory_require_attestation?: boolean;
    application_questions?: string[];
    application_allow_alternative_proof?: boolean;
    application_require_portfolio_url?: boolean;
    price: number;
    currency?: string;
    status?: string;
    confirmation_delay_hours?: number;
    prerequisites_text?: string;
    instructor_ids?: number[];
    /** Either upload an image here, or leave it unset and paste a thumbnail_url instead. */
    thumbnail?: File;
}

/**
 * Plain JSON when there's no file to upload (the common case); multipart only when a thumbnail
 * is attached — mirrors the file-or-no-file branching already established in `ForumComposer`.
 * `instructor_ids`/`application_questions` are the array fields, appended index-free
 * (`field[]`) the way Laravel expects an array from a multipart body.
 */
function buildCourseFormData(payload: Partial<CoursePayload>): FormData {
    const { instructor_ids, application_questions, ...rest } = payload;
    const formData = toFormData(rest);

    instructor_ids?.forEach((id) => formData.append('instructor_ids[]', String(id)));
    application_questions?.forEach((question) => formData.append('application_questions[]', question));

    return formData;
}

export async function createCourse(payload: CoursePayload): Promise<Course> {
    if (payload.thumbnail) {
        const response = await postFormData<{ data: Course }>('/courses', buildCourseFormData(payload));
        return response.data;
    }

    const { data } = await apiClient.post<{ data: Course }>('/courses', payload);
    return data.data;
}

export async function updateCourse(id: number, payload: Partial<CoursePayload>): Promise<Course> {
    if (payload.thumbnail) {
        const response = await postFormData<{ data: Course }>(`/courses/${id}`, buildCourseFormData(payload), 'PATCH');
        return response.data;
    }

    const { data } = await apiClient.patch<{ data: Course }>(`/courses/${id}`, payload);
    return data.data;
}

export async function deleteCourse(id: number): Promise<void> {
    await apiClient.delete(`/courses/${id}`);
}
