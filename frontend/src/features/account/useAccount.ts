import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    changePassword,
    logoutOtherSessions,
    requestAccountDeactivation,
    updateProfile,
    uploadAvatar,
} from '@/features/account/api';

export function useRequestAccountDeactivation() {
    return useMutation({
        mutationFn: requestAccountDeactivation,
    });
}

export function useUploadAvatar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: uploadAvatar,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateProfile,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: changePassword,
    });
}

export function useLogoutOtherSessions() {
    return useMutation({
        mutationFn: logoutOtherSessions,
    });
}
