import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
    },
});

let csrfCookieFetched = false;

/**
 * Sanctum's SPA authentication needs the XSRF cookie seeded before the first mutating
 * request (login/register). Cached per page load — the cookie itself is refreshed by
 * Laravel on session boundaries, not on every request.
 */
export async function ensureCsrfCookie(): Promise<void> {
    if (csrfCookieFetched) {
        return;
    }

    try {
        await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, { withCredentials: true });
        csrfCookieFetched = true;
    } catch (error) {
        throw toApiError(error as AxiosError<ApiErrorBody>);
    }
}

export class ApiError extends Error {
    readonly code: string;
    readonly status: number;
    readonly fields: Record<string, string[]> | null;
    readonly missing_fields?: string[];

    constructor(status: number, code: string, message: string, fields: Record<string, string[]> | null, missingFields?: string[]) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
        this.missing_fields = missingFields;
    }

    fieldError(field: string): string | undefined {
        return this.fields?.[field]?.[0];
    }
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;

    if (body?.error) {
        return new ApiError(status, body.error.code, body.error.message, body.error.fields, body.error.missing_fields);
    }

    return new ApiError(status, 'network_error', error.message, null);
}

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorBody>) => Promise.reject(toApiError(error)),
);
