import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmPaymentSubmission, fetchOrders, fetchPaymentSummary, rejectPaymentSubmission, updateOrder } from '@/features/admin/payments/api';
import type { OrderStatus } from '@/lib/api/types';

export function useOrders(status?: OrderStatus) {
    return useQuery({
        queryKey: ['admin', 'orders', status ?? null],
        queryFn: () => fetchOrders(status),
    });
}

export function usePaymentSummary() {
    return useQuery({
        queryKey: ['admin', 'orders-summary'],
        queryFn: fetchPaymentSummary,
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, ...payload }: { orderId: number; amount_paid: number; payment_method?: string | null }) =>
            updateOrder(orderId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders-summary'] });
        },
    });
}

export function useConfirmPaymentSubmission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: confirmPaymentSubmission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders-summary'] });
        },
    });
}

export function useRejectPaymentSubmission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: rejectPaymentSubmission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders-summary'] });
        },
    });
}
