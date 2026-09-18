import { useQuery } from '@tanstack/react-query';
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

/**
 * Looks up a certificate number, or stays idle while `certificateNumber` is empty.
 *
 * A query rather than a mutation because the lookup also runs unprompted, on mount, when someone
 * arrives by scanning a certificate's QR code — and under StrictMode a mutation started from a
 * mount effect loses its result when React re-subscribes the observer, leaving the form stuck on
 * "verifying". Nothing is being changed here either way, so a keyed read is the better fit.
 */
export function useVerifyCertificate(certificateNumber: string) {
    return useQuery({
        queryKey: ['certificates', 'verify', certificateNumber],
        queryFn: () => verifyCertificate(certificateNumber),
        enabled: certificateNumber !== '',
        // "No such certificate" is an answer, not a failure to retry.
        retry: false,
    });
}

export function useAttendanceRoster(resourceId: number) {
    return useQuery({
        queryKey: ['resources', resourceId, 'attendance'],
        queryFn: () => fetchAttendanceRoster(resourceId),
        enabled: Number.isFinite(resourceId),
    });
}
