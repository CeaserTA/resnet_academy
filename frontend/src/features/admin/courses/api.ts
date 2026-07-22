import { apiClient } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';

export interface CoursePayload {
    title: string;
    slug?: string;
    category_id?: number;
    description?: string;
    level: string;
    price: number;
    currency?: string;
    status?: string;
    confirmation_delay_hours?: number;
    prerequisites_text?: string;
    instructor_ids?: number[];
}

export async function createCourse(payload: CoursePayload): Promise<Course> {
    const { data } = await apiClient.post<{ data: Course }>('/courses', payload);
    return data.data;
}

export async function updateCourse(id: number, payload: Partial<CoursePayload>): Promise<Course> {
    const { data } = await apiClient.patch<{ data: Course }>(`/courses/${id}`, payload);
    return data.data;
}

export async function deleteCourse(id: number): Promise<void> {
    await apiClient.delete(`/courses/${id}`);
}
