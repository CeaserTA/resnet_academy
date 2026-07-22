import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAttendanceRoster, fetchMyCertificates, fetchProgressDashboard, verifyCertificate } from '@/features/progress/api';

export function useProgressDashboard() {
    return useQuery({
        queryKey: ['me', 'progress'],
        queryFn: fetchProgressDashboard,
    });
}

export function useMyCertificates() {
    return useQuery({
        queryKey: ['certificates', 'mine'],
        queryFn: fetchMyCertificates,
    });
}

export function useVerifyCertificate() {
    return useMutation({
        mutationFn: (certificateNumber: string) => verifyCertificate(certificateNumber),
    });
}

export function useAttendanceRoster(resourceId: number) {
    return useQuery({
        queryKey: ['resources', resourceId, 'attendance'],
        queryFn: () => fetchAttendanceRoster(resourceId),
        enabled: Number.isFinite(resourceId),
    });
}
