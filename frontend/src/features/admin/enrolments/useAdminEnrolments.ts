import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminEnrolments, getTransferRequests, transferEnrolment, refundEnrolment, updateEnrolmentStatus, type AdminEnrolmentFilters } from '@/features/admin/enrolments/api';
import type { EnrolmentStatus } from '@/lib/api/types';

export function useAdminEnrolments(filters: AdminEnrolmentFilters) {
    return useQuery({
        queryKey: ['admin', 'enrolments', filters],
        queryFn: () => fetchAdminEnrolments(filters),
    });
}

/**
 * Every enrolment across all pages (the endpoint pages at 25). Used where a page needs each
 * student's cohorts at once, e.g. the Team list.
 */
export function useAllAdminEnrolments(enabled = true) {
    return useQuery({
        queryKey: ['admin', 'enrolments', 'all'],
        enabled,
        queryFn: async () => {
            const first = await fetchAdminEnrolments({ page: 1 });
            const rest = await Promise.all(
                Array.from({ length: first.meta.last_page - 1 }, (_, i) => fetchAdminEnrolments({ page: i + 2 })),
            );
            return [first, ...rest].flatMap((page) => page.data);
        },
    });
}

export function useUpdateEnrolmentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ enrolmentId, status }: { enrolmentId: number; status: EnrolmentStatus }) =>
            updateEnrolmentStatus(enrolmentId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'enrolments'] });
        },
    });
}

export function useTransferRequests(page = 1) {
    return useQuery({
        queryKey: ['admin', 'transfer-requests', page],
        queryFn: () => getTransferRequests(page),
    });
}

export function useTransferEnrolment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ enrolmentId, payload }: { enrolmentId: number; payload: { course_id: number; cohort_course_id: number; note?: string } }) =>
            transferEnrolment(enrolmentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'transfer-requests'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'enrolments'] });
        },
    });
}

export function useRefundEnrolment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ enrolmentId, payload }: { enrolmentId: number; payload: { refund_amount: number; note?: string } }) =>
            refundEnrolment(enrolmentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'transfer-requests'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'enrolments'] });
        },
    });
}
