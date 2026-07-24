import { apiClient } from '@/lib/api/client';
import type { Category } from '@/lib/api/types';

export interface CategoryPayload {
    name: string;
    slug?: string;
    parent_id?: number;
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
    const { data } = await apiClient.post<{ data: Category }>('/categories', payload);
    return data.data;
}
