import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, KeyRound, LogOut, Pencil, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { userRoleDisplay } from '@/lib/statusBadge';
import {
    useChangePassword,
    useLogoutOtherSessions,
    useRequestAccountDeactivation,
    useUpdateProfile,
    useUploadAvatar,
} from '@/features/account/useAccount';
import type { User } from '@/lib/api/types';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function EditProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
    const { refetch } = useAuth();
    const updateProfile = useUpdateProfile();
    const [firstName, setFirstName] = useState(user.first_name ?? '');
    const [lastName, setLastName] = useState(user.last_name ?? '');
    const [phone, setPhone] = useState(user.phone ?? '');
    const [bio, setBio] = useState(user.bio ?? '');
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setError(null);

        try {
            await updateProfile.mutateAsync({
                first_name: firstName,
                last_name: lastName || undefined,
                phone: phone || undefined,
                bio: bio || undefined,
            });
            await refetch();
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not update your profile.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Edit profile"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={updateProfile.isPending}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Textarea label="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
        </Modal>
    );
}

function EditAddressModal({ user, onClose }: { user: User; onClose: () => void }) {
    const { refetch } = useAuth();
    const updateProfile = useUpdateProfile();
    const [country, setCountry] = useState(user.country ?? '');
    const [city, setCity] = useState(user.city ?? '');
    const [postalCode, setPostalCode] = useState(user.postal_code ?? '');
    const [taxId, setTaxId] = useState(user.tax_id ?? '');
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setError(null);

        try {
            await updateProfile.mutateAsync({
                first_name: user.first_name ?? user.name,
                last_name: user.last_name ?? undefined,
                country: country || undefined,
                city: city || undefined,
                postal_code: postalCode || undefined,
                tax_id: taxId || undefined,
            });
            await refetch();
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not update your address.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Edit address"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={updateProfile.isPending}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                    <Input label="City / State" value={city} onChange={(e) => setCity(e.target.value)} />
                    <Input label="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    <Input label="Tax ID" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
            </div>
        </Modal>
    );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const changePassword = useChangePassword();
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError(null);
        setSuccess(false);

        try {
            await changePassword.mutateAsync({
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            });
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            setSuccess(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not change your password.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Change password"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                    <Button onClick={handleSave} isLoading={changePassword.isPending}>
                        Change password
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}
                {success && <Alert variant="success" message="Your password has been changed." />}

                <Input
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
                <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Input
                    label="Confirm new password"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                />
            </div>
        </Modal>
    );
}

/**
 * architecture.md §7: delete-on-request, self-service. Deactivation is a soft, admin-reversible
 * lock (not a hard delete) — see AccountController's docblock. Profile/address/security/danger
 * zone are one bordered container with internal dividers rather than four separate cards, to cut
 * down on repeated chrome/whitespace. "Delete account" from the original reference design is
 * deliberately kept as "Deactivate my account": this codebase never supports a real hard delete
 * (cascades would corrupt other users' grades, forum history, and audit trail) — but the button
 * is styled destructive throughout, not just after the confirm step.
 */
export function AccountPage() {
    const { user, refetch } = useAuth();
    const navigate = useNavigate();
    const requestDeactivation = useRequestAccountDeactivation();
    const logoutOtherSessions = useLogoutOtherSessions();
    const uploadAvatar = useUploadAvatar();

    const [isConfirmingDeactivation, setIsConfirmingDeactivation] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [logoutOtherResult, setLogoutOtherResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isViewingPhoto, setIsViewingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (window.location.hash === '#security') {
            document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

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

    const handleLogoutOtherSessions = async () => {
        setLogoutOtherResult(null);

        try {
            await logoutOtherSessions.mutateAsync();
            setLogoutOtherResult({ ok: true, message: 'Every other session has been signed out.' });
        } catch {
            setLogoutOtherResult({ ok: false, message: 'Could not sign out other sessions. Try again.' });
        }
    };

    if (!user) {
        return <Spinner />;
    }

    const role = userRoleDisplay(user.role);
    const locationLabel = [user.city, user.country].filter(Boolean).join(', ');

    return (
        <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl">My Profile</h1>

            <Card className="mt-6 shadow-none">
                {/* Profile */}
                <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {user.avatar_url ? (
                                <button
                                    type="button"
                                    onClick={() => setIsViewingPhoto(true)}
                                    aria-label="View profile photo"
                                    className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                >
                                    <Avatar name={user.name} src={user.avatar_url} size="lg" />
                                </button>
                            ) : (
                                <Avatar name={user.name} src={user.avatar_url} size="lg" />
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-semibold text-ink-900">{user.name}</p>
                                    <Badge label={role.label} tone={role.tone} icon={role.icon} />
                                </div>
                                {locationLabel && <p className="text-sm text-ink-600">{locationLabel}</p>}
                            </div>
                        </div>
                        <Button variant="secondary" onClick={() => setIsEditingProfile(true)} aria-label="Edit profile">
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                        </Button>
                    </div>

                    {avatarError && <Alert variant="error" message={avatarError} className="mt-4" />}

                    <div className="mt-4 flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <Button variant="ghost" onClick={() => fileInputRef.current?.click()} isLoading={uploadAvatar.isPending}>
                            <Camera className="size-4" aria-hidden="true" />
                            Change photo
                        </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 border-t border-surface-100 pt-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">First name</p>
                            <p className="text-sm text-ink-900">{user.first_name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Last name</p>
                            <p className="text-sm text-ink-900">{user.last_name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Email address</p>
                            <p className="text-sm text-ink-900">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Phone</p>
                            <p className="text-sm text-ink-900">{user.phone || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Bio</p>
                            <p className="text-sm text-ink-900">{user.bio || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="mt-6 border-t border-surface-100 pt-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg">Address</h2>
                        <Button variant="secondary" onClick={() => setIsEditingAddress(true)} aria-label="Edit address">
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                        </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Country</p>
                            <p className="text-sm text-ink-900">{user.country || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">City / State</p>
                            <p className="text-sm text-ink-900">{user.city || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Postal code</p>
                            <p className="text-sm text-ink-900">{user.postal_code || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Tax ID</p>
                            <p className="text-sm text-ink-900">{user.tax_id || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div id="security" className="mt-6 border-t border-surface-100 pt-6">
                    <h2 className="text-lg">Security</h2>
                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-ink-900">Change Password</p>
                            <p className="text-xs text-ink-600">Reset your current password and choose a new one.</p>
                        </div>
                        <Button variant="secondary" onClick={() => setIsChangingPassword(true)}>
                            <KeyRound className="size-4" aria-hidden="true" />
                            Change Password
                        </Button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-6 border-t border-surface-100 pt-6">
                    <h2 className="text-lg">Danger Zone</h2>

                    {logoutOtherResult && (
                        <Alert
                            variant={logoutOtherResult.ok ? 'success' : 'error'}
                            message={logoutOtherResult.message}
                            className="mt-3"
                        />
                    )}
                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-ink-900">Logout all devices</p>
                            <p className="text-xs text-ink-600">Sign out from every other active session.</p>
                        </div>
                        <Button variant="secondary" onClick={handleLogoutOtherSessions} isLoading={logoutOtherSessions.isPending}>
                            <LogOut className="size-4" aria-hidden="true" />
                            Logout all devices
                        </Button>
                    </div>

                    {requestDeactivation.isError && (
                        <Alert variant="error" message="Couldn't deactivate your account. Try again." className="mt-3" />
                    )}
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-surface-100 pt-4">
                        <div>
                            <p className="text-sm text-ink-900">Deactivate my account</p>
                            <p className="text-xs text-ink-600">
                                Signs you out and locks your account until an administrator reactivates it.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={handleDeactivate} isLoading={requestDeactivation.isPending}>
                            <ShieldAlert className="size-4" aria-hidden="true" />
                            {isConfirmingDeactivation ? 'Confirm deactivation?' : 'Deactivate my account'}
                        </Button>
                    </div>
                </div>
            </Card>

            {isEditingProfile && <EditProfileModal user={user} onClose={() => setIsEditingProfile(false)} />}
            {isEditingAddress && <EditAddressModal user={user} onClose={() => setIsEditingAddress(false)} />}
            {isChangingPassword && <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />}
            {isViewingPhoto && user.avatar_url && (
                <Modal isOpen onClose={() => setIsViewingPhoto(false)} title="Profile photo">
                    <img src={user.avatar_url} alt={user.name} className="mx-auto max-h-[70vh] w-full rounded-lg object-contain" />
                </Modal>
            )}
        </div>
    );
}
