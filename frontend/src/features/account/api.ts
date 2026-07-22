import { apiClient } from '@/lib/api/client';

export async function fetchAccountDataExport(): Promise<unknown> {
    const { data } = await apiClient.get('/me/data-export');
    return data;
}

export async function requestAccountDeactivation(): Promise<void> {
    await apiClient.post('/me/request-deactivation');
}
