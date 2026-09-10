import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CohortCourse, Course } from '@/lib/api/types';

/** A CohortCourse as returned by the public browse endpoints — `course` is always eager-loaded there. */
export type PublicCohortOffering = CohortCourse & { course: Course };
import {
    fetchCohorts,
    fetchCohort,
    createCohort,
    updateCohort,
    deleteCohort,
    fetchCohortCoursesForCourse,
    attachCourseToCohort,
    updateCohortCourse,
    detachCohortCourse,
    fetchCohortAnalytics,
    type CreateCohortInput,
    type AttachCourseInput,
    type UpdateCohortCourseInput,
} from './api';

export function useCohorts(params?: { status?: string }) {
    return useQuery({
        queryKey: ['cohorts', params],
        queryFn: () => fetchCohorts(params),
    });
}

export function useCohort(id: number) {
    return useQuery({
        queryKey: ['cohorts', id],
        queryFn: () => fetchCohort(id),
        enabled: Number.isFinite(id),
    });
}

/**
 * Every published cohort's course offerings, flattened into one list — powers the landing
 * page cohort teaser and the catalogue's "Cohort Schedule" section, both of which show
 * course-offering cards across all cohorts rather than grouped by cohort.
 */
export function usePublicCohortOfferings() {
    const query = useCohorts({ status: 'published' });
    const offerings = (query.data ?? []).flatMap((cohort) => cohort.courses) as PublicCohortOffering[];

    return { ...query, data: offerings };
}

export function useCohortCoursesForCourse(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'cohort-courses'],
        queryFn: () => fetchCohortCoursesForCourse(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useCohortAnalytics(cohortId: number) {
    return useQuery({
        queryKey: ['cohorts', cohortId, 'report'],
        queryFn: () => fetchCohortAnalytics(cohortId),
        enabled: Number.isFinite(cohortId),
    });
}

export function useCreateCohort() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateCohortInput) => createCohort(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] }),
    });
}

export function useUpdateCohort(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: Partial<CreateCohortInput>) => updateCohort(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cohorts'] });
            queryClient.invalidateQueries({ queryKey: ['cohorts', id] });
        },
    });
}

export function useDeleteCohort() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteCohort(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] }),
    });
}

export function useAttachCourse(cohortId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: AttachCourseInput) => attachCourseToCohort(cohortId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cohorts', cohortId] });
            queryClient.invalidateQueries({ queryKey: ['cohorts'] });
        },
    });
}

export function useUpdateCohortCourse(cohortId: number, cohortCourseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateCohortCourseInput) => updateCohortCourse(cohortCourseId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts', cohortId] }),
    });
}

export function useDetachCohortCourse(cohortId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (cohortCourseId: number) => detachCohortCourse(cohortCourseId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts', cohortId] }),
    });
}
