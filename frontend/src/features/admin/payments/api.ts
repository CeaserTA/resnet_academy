import { apiClient } from '@/lib/api/client';
import type { Order, OrderStatus, PaginatedResponse } from '@/lib/api/types';

export async function fetchOrders(status?: OrderStatus): Promise<PaginatedResponse<Order>> {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', {
        params: { status: status || undefined },
    });
    return data;
}
