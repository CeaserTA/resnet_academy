import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '@/features/admin/payments/api';
import type { OrderStatus } from '@/lib/api/types';

export function useOrders(status?: OrderStatus) {
    return useQuery({
        queryKey: ['admin', 'orders', status ?? null],
        queryFn: () => fetchOrders(status),
    });
}
