import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrolInCourse, fetchMyEnrolments, submitPayment, withdrawEnrolment } from '@/features/enrolment/api';

export function useMyEnrolments(page = 1) {
    return useQuery({
        queryKey: ['enrolments', 'me', page],
        queryFn: () => fetchMyEnrolments(page),
    });
}

export function useEnrol() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: enrolInCourse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrolments', 'me'] });
        },
    });
}

export function useWithdrawEnrolment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: withdrawEnrolment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrolments', 'me'] });
        },
    });
}

export function useSubmitPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, amount, receipt }: { orderId: number; amount: number; receipt: File }) =>
            submitPayment(orderId, amount, receipt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrolments', 'me'] });
        },
    });
}
