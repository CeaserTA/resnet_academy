import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminEnrolments, getTransferRequests, transferEnrolment, refundEnrolment, updateEnrolmentStatus, type AdminEnrolmentFilters } from '@/features/admin/enrolments/api';
import type { EnrolmentStatus } from '@/lib/api/types';

export function useAdminEnrolments(filters: AdminEnrolmentFilters) {
    return useQuery({
        queryKey: ['admin', 'enrolments', filters],
        queryFn: () => fetchAdminEnrolments(filters),
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

export function useTransferRequests() {
    return useQuery({
        queryKey: ['admin', 'transfer-requests'],
        queryFn: () => getTransferRequests(),
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
