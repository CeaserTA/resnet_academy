import { apiClient } from '@/lib/api/client';
import type { Order, OrderStatus, PaginatedResponse, PaymentSubmission } from '@/lib/api/types';

export async function fetchOrders(status?: OrderStatus): Promise<PaginatedResponse<Order>> {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', {
        params: { status: status || undefined },
    });
    return data;
}

export async function updateOrder(
    orderId: number,
    payload: { amount_paid: number; payment_method?: string | null },
): Promise<Order> {
    const { data } = await apiClient.patch<{ data: Order }>(`/admin/orders/${orderId}`, payload);
    return data.data;
}

export async function confirmPaymentSubmission(submissionId: number): Promise<PaymentSubmission> {
    const { data } = await apiClient.patch<{ data: PaymentSubmission }>(`/admin/payment-submissions/${submissionId}/confirm`);
    return data.data;
}

export async function rejectPaymentSubmission(submissionId: number): Promise<PaymentSubmission> {
    const { data } = await apiClient.patch<{ data: PaymentSubmission }>(`/admin/payment-submissions/${submissionId}/reject`);
    return data.data;
}
