import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteApplication, fetchApplications, setApplicationStatus, updateApplication } from '@/features/admin/applications/api';
import type { Application, ApplicationStatus } from '@/features/admin/applications/mockApplications';

const QUERY_KEY = ['admin', 'applications'];

export function useApplications() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchApplications,
    });
}

export function useSetApplicationStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) => setApplicationStatus(id, status),
        onSuccess: (result) => {
            queryClient.setQueryData<Application[]>(QUERY_KEY, (old) =>
                old?.map((application) => (application.id === result.id ? { ...application, status: result.status } : application)),
            );
        },
    });
}

export function useUpdateApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }: { id: number } & Pick<Application, 'studentName' | 'studentEmail' | 'courseTitle'>) =>
            updateApplication(id, payload),
        onSuccess: (result) => {
            queryClient.setQueryData<Application[]>(QUERY_KEY, (old) =>
                old?.map((application) => (application.id === result.id ? { ...application, ...result } : application)),
            );
        },
    });
}

export function useDeleteApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteApplication(id),
        onSuccess: (result) => {
            queryClient.setQueryData<Application[]>(QUERY_KEY, (old) => old?.filter((application) => application.id !== result.id));
        },
    });
}
