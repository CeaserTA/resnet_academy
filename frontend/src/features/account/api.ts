import { apiClient } from '@/lib/api/client';
import { postFormData, toFormData } from '@/lib/api/formData';
import type { User } from '@/lib/api/types';

export async function fetchAccountDataExport(): Promise<unknown> {
    const { data } = await apiClient.get('/me/data-export');
    return data;
}

export async function requestAccountDeactivation(): Promise<void> {
    await apiClient.post('/me/request-deactivation');
}

export async function uploadAvatar(avatar: File): Promise<User> {
    const { data } = await postFormData<{ data: User }>('/me/avatar', toFormData({ avatar }));
    return data;
}
