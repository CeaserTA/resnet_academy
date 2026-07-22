import { apiClient } from '@/lib/api/client';
import type { PaginatedResponse, User, UserRole } from '@/lib/api/types';

export async function fetchUsers(role?: UserRole): Promise<User[]> {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params: { role } });
    return data.data;
}

export interface ProvisionUserPayload {
    name: string;
    email: string;
    password: string;
    role: 'instructor' | 'admin';
}

export async function provisionUser(payload: ProvisionUserPayload): Promise<User> {
    const { data } = await apiClient.post<{ data: User }>('/admin/users', payload);
    return data.data;
}

export async function updateUser(
    userId: number,
    payload: { role?: UserRole; status?: string },
): Promise<User> {
    const { data } = await apiClient.patch<{ data: User }>(`/admin/users/${userId}`, payload);
    return data.data;
}
