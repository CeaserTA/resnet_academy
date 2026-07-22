import { apiClient, ensureCsrfCookie } from '@/lib/api/client';
import type { User } from '@/lib/api/types';

export const googleRedirectUrl = `${import.meta.env.VITE_API_BASE_URL as string}/api/v1/auth/google/redirect`;

export async function fetchCurrentUser(): Promise<User | null> {
    try {
        const { data } = await apiClient.get<{ data: User }>('/user');
        return data.data;
    } catch {
        return null;
    }
}

export async function login(email: string, password: string): Promise<void> {
    await ensureCsrfCookie();
    await apiClient.post('/login', { email, password });
}

export async function register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
): Promise<void> {
    await ensureCsrfCookie();
    await apiClient.post('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
    });
}

export async function logout(): Promise<void> {
    await apiClient.post('/logout');
}

export async function requestPasswordReset(email: string): Promise<void> {
    await ensureCsrfCookie();
    await apiClient.post('/forgot-password', { email });
}

export async function resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string,
): Promise<void> {
    await ensureCsrfCookie();
    await apiClient.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
    });
}

export async function resendVerificationEmail(): Promise<void> {
    await apiClient.post('/email/verification-notification');
}
