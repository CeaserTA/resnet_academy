import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccountDataExport, requestAccountDeactivation, uploadAvatar } from '@/features/account/api';

/**
 * Triggers a browser download rather than just returning the JSON — this is a one-off export
 * action, not cached query data, so a mutation (not a query) is the right shape here.
 */
export function useDownloadAccountData() {
    return useMutation({
        mutationFn: async () => {
            const data = await fetchAccountDataExport();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'resnet-data-export.json';
            link.click();
            URL.revokeObjectURL(url);
        },
    });
}

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
