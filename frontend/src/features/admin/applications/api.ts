import { MOCK_APPLICATIONS, type Application, type ApplicationStatus } from '@/features/admin/applications/mockApplications';

/**
 * Frontend-only preview — no backend endpoint exists yet (see `mockApplications.ts` for why).
 * Shaped as async calls through the same `useQuery`/`useMutation` pattern as every real list
 * page (mutations resolve instantly and mutate the query cache directly — see
 * `useApplications.ts`), so swapping in a live endpoint later is a one-line change here, not a
 * rewrite.
 */
export async function fetchApplications(): Promise<Application[]> {
    return Promise.resolve(MOCK_APPLICATIONS);
}

export async function setApplicationStatus(id: number, status: ApplicationStatus): Promise<{ id: number; status: ApplicationStatus }> {
    return Promise.resolve({ id, status });
}

export async function updateApplication(
    id: number,
    payload: Pick<Application, 'studentName' | 'studentEmail' | 'courseTitle'>,
): Promise<{ id: number } & Pick<Application, 'studentName' | 'studentEmail' | 'courseTitle'>> {
    return Promise.resolve({ id, ...payload });
}

export async function deleteApplication(id: number): Promise<{ id: number }> {
    return Promise.resolve({ id });
}
