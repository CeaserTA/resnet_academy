import { apiClient } from '@/lib/api/client';
import type { Cohort, CohortCourse, CohortAnalytics, CohortCourseStatus, CohortStatus } from '@/lib/api/types';

export interface CreateCohortInput {
    name: string;
    start_date: string;
    end_date: string;
    application_deadline?: string;
    status?: CohortStatus;
}

export interface AttachCourseInput {
    course_id: number;
    capacity?: number;
    status: CohortCourseStatus;
    primary_instructor_id?: number;
    price_override?: number;
    currency_override?: string;
}

export interface UpdateCohortCourseInput {
    capacity?: number | null;
    status?: CohortCourseStatus;
    primary_instructor_id?: number | null;
    price_override?: number | null;
    currency_override?: string | null;
}

export async function fetchCohorts(params?: { status?: string }): Promise<Cohort[]> {
    const { data } = await apiClient.get<{ data: Cohort[] }>('/cohorts', { params });
    return data.data;
}

export async function fetchCohort(id: number): Promise<Cohort> {
    const { data } = await apiClient.get<{ data: Cohort }>(`/cohorts/${id}`);
    return data.data;
}

export async function createCohort(payload: CreateCohortInput): Promise<Cohort> {
    const { data } = await apiClient.post<{ data: Cohort }>('/cohorts', payload);
    return data.data;
}

export async function updateCohort(id: number, payload: Partial<CreateCohortInput>): Promise<Cohort> {
    const { data } = await apiClient.patch<{ data: Cohort }>(`/cohorts/${id}`, payload);
    return data.data;
}

export async function deleteCohort(id: number): Promise<void> {
    await apiClient.delete(`/cohorts/${id}`);
}

export async function fetchCohortCoursesForCourse(courseId: number): Promise<CohortCourse[]> {
    const { data } = await apiClient.get<{ data: CohortCourse[] }>(`/courses/${courseId}/cohort-courses`);
    return data.data;
}

export async function attachCourseToCohort(cohortId: number, payload: AttachCourseInput): Promise<CohortCourse> {
    const { data } = await apiClient.post<{ data: CohortCourse }>(`/cohorts/${cohortId}/courses`, payload);
    return data.data;
}

export async function fetchCohortCourse(cohortCourseId: number): Promise<CohortCourse> {
    const { data } = await apiClient.get<{ data: CohortCourse }>(`/cohort-courses/${cohortCourseId}`);
    return data.data;
}

export async function updateCohortCourse(cohortCourseId: number, payload: UpdateCohortCourseInput): Promise<CohortCourse> {
    const { data } = await apiClient.patch<{ data: CohortCourse }>(`/cohort-courses/${cohortCourseId}`, payload);
    return data.data;
}

export async function detachCohortCourse(cohortCourseId: number): Promise<void> {
    await apiClient.delete(`/cohort-courses/${cohortCourseId}`);
}

export async function fetchCohortAnalytics(cohortId: number): Promise<CohortAnalytics> {
    const { data } = await apiClient.get<{ data: CohortAnalytics }>(`/admin/cohorts/${cohortId}/report`);
    return data.data;
}
