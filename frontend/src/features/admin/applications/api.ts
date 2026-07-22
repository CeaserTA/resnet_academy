import { MOCK_APPLICATIONS, type Application } from '@/features/admin/applications/mockApplications';

/**
 * Frontend-only preview — no backend endpoint exists yet (see `mockApplications.ts` for why).
 * Shaped as an async call through the same `useQuery` pattern as every real list page, so
 * swapping in a live endpoint later is a one-line change here, not a rewrite.
 */
export async function fetchApplications(): Promise<Application[]> {
    return Promise.resolve(MOCK_APPLICATIONS);
}
