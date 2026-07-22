import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, provisionUser, updateUser, type ProvisionUserPayload } from '@/features/admin/users/api';
import type { UserRole } from '@/lib/api/types';

export function useUsers(role?: UserRole) {
    return useQuery({
        queryKey: ['admin', 'users', role],
        queryFn: () => fetchUsers(role),
    });
}

export function useProvisionUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ProvisionUserPayload) => provisionUser(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...payload }: { userId: number; role?: UserRole; status?: string }) =>
            updateUser(userId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}
