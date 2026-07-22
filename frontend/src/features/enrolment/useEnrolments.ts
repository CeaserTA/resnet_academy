import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrolInCourse, fetchMyEnrolments, withdrawEnrolment } from '@/features/enrolment/api';

export function useMyEnrolments(page = 1) {
    return useQuery({
        queryKey: ['enrolments', 'me', page],
        queryFn: () => fetchMyEnrolments(page),
    });
}

export function useEnrol() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: enrolInCourse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrolments', 'me'] });
        },
    });
}

export function useWithdrawEnrolment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: withdrawEnrolment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrolments', 'me'] });
        },
    });
}
