import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchAdminCertificates,
    regenerateCertificate,
    type AdminCertificateFilters,
} from '@/features/admin/certificates/api';

export function useAdminCertificates(filters: AdminCertificateFilters) {
    return useQuery({
        queryKey: ['admin', 'certificates', filters],
        queryFn: () => fetchAdminCertificates(filters),
        placeholderData: keepPreviousData,
    });
}

export function useRegenerateCertificate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (certificateId: number) => regenerateCertificate(certificateId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'certificates'] }),
    });
}
