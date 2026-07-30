import { apiClient } from '@/lib/api/client';
import { postFormData, toFormData } from '@/lib/api/formData';
import type { User } from '@/lib/api/types';

export async function requestAccountDeactivation(): Promise<void> {
    await apiClient.post('/me/request-deactivation');
}

export async function uploadAvatar(avatar: File): Promise<User> {
    const { data } = await postFormData<{ data: User }>('/me/avatar', toFormData({ avatar }));
    return data;
}

export interface UpdateProfilePayload {
    first_name: string;
    last_name?: string;
    phone?: string;
    bio?: string;
    country?: string;
    city?: string;
    postal_code?: string;
    tax_id?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await apiClient.patch<{ data: User }>('/me/profile', payload);
    return data.data;
}

export interface ChangePasswordPayload {
    current_password: string;
    password: string;
    password_confirmation: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/me/change-password', payload);
}

export async function logoutOtherSessions(): Promise<void> {
    await apiClient.post('/me/logout-other-devices');
}
