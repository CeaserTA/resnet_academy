import { apiClient } from '@/lib/api/client';
import type { Category, Course, Module, PaginatedResponse } from '@/lib/api/types';

export interface CourseFilters {
    category_id?: number;
    level?: string;
    instructor_id?: number;
    schedule_from?: string;
    schedule_to?: string;
    status?: string;
    page?: number;
}

export async function fetchCourses(filters: CourseFilters): Promise<PaginatedResponse<Course>> {
    const { data } = await apiClient.get<PaginatedResponse<Course>>('/courses', { params: filters });
    return data;
}

export async function fetchCourse(id: number): Promise<Course> {
    const { data } = await apiClient.get<{ data: Course }>(`/courses/${id}`);
    return data.data;
}

export async function fetchCategories(): Promise<Category[]> {
    const { data } = await apiClient.get<{ data: Category[] }>('/categories');
    return data.data;
}

export async function fetchCourseModules(courseId: number): Promise<Module[]> {
    const { data } = await apiClient.get<{ data: Module[] }>(`/courses/${courseId}/modules`);
    return data.data;
}
