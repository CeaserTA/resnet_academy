import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminEnrolments, updateEnrolmentStatus, type AdminEnrolmentFilters } from '@/features/admin/enrolments/api';
import type { EnrolmentStatus } from '@/lib/api/types';

export function useAdminEnrolments(filters: AdminEnrolmentFilters) {
    return useQuery({
        queryKey: ['admin', 'enrolments', filters],
        queryFn: () => fetchAdminEnrolments(filters),
    });
}

export function useUpdateEnrolmentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ enrolmentId, status }: { enrolmentId: number; status: EnrolmentStatus }) =>
            updateEnrolmentStatus(enrolmentId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'enrolments'] });
        },
    });
}
