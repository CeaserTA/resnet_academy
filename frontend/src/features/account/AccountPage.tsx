import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Download, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDownloadAccountData, useRequestAccountDeactivation, useUploadAvatar } from '@/features/account/useAccount';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * architecture.md §7: personal-data export and delete-on-request, self-service. Deactivation
 * is a soft, admin-reversible lock (not a hard delete) — see AccountController's docblock.
 */
export function AccountPage() {
    const { user, refetch } = useAuth();
    const navigate = useNavigate();
    const downloadData = useDownloadAccountData();
    const requestDeactivation = useRequestAccountDeactivation();
    const uploadAvatar = useUploadAvatar();
    const [isConfirmingDeactivation, setIsConfirmingDeactivation] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDeactivate = async () => {
        if (!isConfirmingDeactivation) {
            setIsConfirmingDeactivation(true);
            return;
        }

        await requestDeactivation.mutateAsync();
        await refetch();
        navigate('/login');
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected) {
            return;
        }

        setAvatarError(null);

        if (selected.size > MAX_AVATAR_BYTES) {
            setAvatarError('That image is over 5MB. Choose a smaller one.');
            return;
        }

        try {
            await uploadAvatar.mutateAsync(selected);
            await refetch();
        } catch (err) {
            setAvatarError(err instanceof ApiError ? err.message : 'Could not upload that photo.');
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl">My data & privacy</h1>
            <p className="mt-1 text-sm text-ink-600">
                Manage the personal data associated with {user?.email}.
            </p>

            <Card className="mt-6">
                <h2 className="text-lg">Profile photo</h2>
                <p className="mt-1 text-sm text-ink-600">
                    Shown next to your name across the app — messages, forum posts, and the top bar.
                </p>

                {avatarError && <Alert variant="error" message={avatarError} className="mt-3" />}

                <div className="mt-3 flex items-center gap-4">
                    {user && <Avatar name={user.name} src={user.avatar_url} size="lg" />}
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={uploadAvatar.isPending}>
                        <Camera className="size-4" aria-hidden="true" />
                        Change photo
                    </Button>
                </div>
            </Card>

            <Card className="mt-4">
                <h2 className="text-lg">Download my data</h2>
                <p className="mt-1 text-sm text-ink-600">
                    Get a JSON file of everything tied to your account: profile, enrolments, certificates,
                    submissions, messages, forum posts, tickets, and notifications.
                </p>
                {downloadData.isError && (
                    <Alert variant="error" message="Couldn't prepare your export. Try again." className="mt-3" />
                )}
                <Button className="mt-3" onClick={() => downloadData.mutate()} isLoading={downloadData.isPending}>
                    <Download className="size-4" aria-hidden="true" />
                    Download my data
                </Button>
            </Card>

            <Card className="mt-4">
                <h2 className="text-lg">Deactivate my account</h2>
                <p className="mt-1 text-sm text-ink-600">
                    This signs you out and locks your account. Your enrolments, grades, and certificates are kept
                    (other people rely on that history), but you won't be able to sign back in until an
                    administrator reactivates it.
                </p>
                {requestDeactivation.isError && (
                    <Alert variant="error" message="Couldn't deactivate your account. Try again." className="mt-3" />
                )}
                <Button
                    variant={isConfirmingDeactivation ? 'destructive' : 'secondary'}
                    className="mt-3"
                    onClick={handleDeactivate}
                    isLoading={requestDeactivation.isPending}
                >
                    <ShieldAlert className="size-4" aria-hidden="true" />
                    {isConfirmingDeactivation ? 'Confirm deactivation?' : 'Deactivate my account'}
                </Button>
            </Card>
        </div>
    );
}
