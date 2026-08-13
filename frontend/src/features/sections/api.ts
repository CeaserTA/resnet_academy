import { apiClient } from '@/lib/api/client';
import type { CourseSection, CreateSectionInput, PublicSection } from './types';

export async function fetchSections(courseId: number): Promise<CourseSection[]> {
    const { data } = await apiClient.get<{ data: CourseSection[] }>(`/courses/${courseId}/sections`);
    return data.data;
}

export async function fetchPublicSections(): Promise<PublicSection[]> {
    const { data } = await apiClient.get<{ data: PublicSection[] }>('/sections/public');
    return data.data;
}

export async function createSection(courseId: number, payload: CreateSectionInput): Promise<CourseSection> {
    const { data } = await apiClient.post<{ data: CourseSection }>(`/courses/${courseId}/sections`, payload);
    return data.data;
}

export async function updateSection(sectionId: number, payload: Partial<CreateSectionInput>): Promise<CourseSection> {
    const { data} = await apiClient.patch<{ data: CourseSection }>(`/sections/${sectionId}`, payload);
    return data.data;
}

export async function deleteSection(sectionId: number): Promise<void> {
    await apiClient.delete(`/sections/${sectionId}`);
}
