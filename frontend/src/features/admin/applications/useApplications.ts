import { useQuery } from '@tanstack/react-query';
import { fetchApplications } from '@/features/admin/applications/api';

export function useApplications() {
    return useQuery({
        queryKey: ['admin', 'applications'],
        queryFn: fetchApplications,
    });
}
