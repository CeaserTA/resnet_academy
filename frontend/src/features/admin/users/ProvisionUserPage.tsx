import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Plus, Search, Settings2, Users } from 'lucide-react';
import { useProvisionUser, useUpdateUser, useUsers } from '@/features/admin/users/useAdminUsers';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { userRoleDisplay, userStatusDisplay } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { User, UserRole, UserStatus } from '@/lib/api/types';

type RoleTab = 'all' | UserRole;

const ROLE_TABS: [RoleTab, string][] = [
    ['all', 'All'],
    ['admin', 'Admins'],
    ['instructor', 'Instructors'],
    ['student', 'Students'],
];

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(150),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    role: z.enum(['instructor', 'admin']),
});

type FormValues = z.infer<typeof schema>;

function ManageUserModal({ user, onClose }: { user: User; onClose: () => void }) {
    const updateUser = useUpdateUser();
    const [role, setRole] = useState<UserRole>(user.role);
    const [status, setStatus] = useState<UserStatus>(user.status);

    const handleSave = async () => {
        const payload: { userId: number; role?: UserRole; status?: UserStatus } = { userId: user.id };
        if (role !== user.role) {
            payload.role = role;
        }
        if (status !== user.status) {
            payload.status = status;
        }
        await updateUser.mutateAsync(payload);
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Manage — ${user.name}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={updateUser.isPending}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-600">{user.email}</p>

                <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                </Select>

                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                </Select>
            </div>
        </Modal>
    );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
    const provisionUser = useProvisionUser();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'instructor' } });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);

        try {
            await provisionUser.mutateAsync(values);
            onClose();
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not create the account.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Add user"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                        Create account
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {formError && <Alert variant="error" message={formError} />}

                <Input label="Full name" error={errors.name?.message} {...register('name')} />
                <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                <Select label="Role" {...register('role')}>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                </Select>

                <p className="text-xs text-ink-600">
                    They'll get an email with a link to set their own password — nothing is created here.
                </p>
            </div>
        </Modal>
    );
}

export function ProvisionUserPage() {
    const { user: currentUser } = useAuth();
    const [roleTab, setRoleTab] = useState<RoleTab>('all');
    const { data: users, isLoading } = useUsers(roleTab === 'all' ? undefined : roleTab);
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);

    const [search, setSearch] = useState('');
    usePageHeader('Team', 'Every user in the system, and their role.');

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return users ?? [];
        }
        return (users ?? []).filter(
            (member) => member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term),
        );
    }, [users, search]);

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            {/* Primary action — title/subtitle live in the top bar (usePageHeader) */}
            <div className="flex items-center justify-end">
                <Button onClick={() => setIsAddingUser(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add user
                </Button>
            </div>

            {/* Filter controls — role tabs + search, same toolbar layout as Enrolments */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5">
                    {ROLE_TABS.map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setRoleTab(value)}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                roleTab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="relative ml-auto w-full max-w-56">
                    <Search
                        className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-600"
                        aria-hidden="true"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or email"
                        aria-label="Search team by name or email"
                        className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-ink-900 transition focus-visible:bg-surface-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </div>
            </div>

            <div>
                {isLoading && <Spinner className="mt-3" />}

                {!isLoading && filteredUsers.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title={users?.length === 0 ? 'No users yet' : 'No users match this search'}
                        description={
                            users?.length === 0 ? 'Everyone in the system appears here.' : 'Try a different search term or role.'
                        }
                        className="mt-3"
                    />
                )}

                {!isLoading && filteredUsers.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        {/* Scrolls sideways on narrow screens instead of clipping columns */}
                        <div className="overflow-x-auto">
                            <div className="min-w-[570px]">
                                {/* Column headers */}
                                <div className="grid grid-cols-[minmax(180px,1fr)_130px_minmax(140px,1fr)_60px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Name</span>
                                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Role</span>
                                    <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                                    <span />
                                </div>

                                {/* Rows */}
                                <ul className="divide-y divide-surface-100">
                                    {filteredUsers.map((member) => {
                                        const role = userRoleDisplay(member.role);
                                        const status = userStatusDisplay(member.status);
                                        const isSelf = member.id === currentUser?.id;

                                        return (
                                            <li
                                                key={member.id}
                                                className="grid grid-cols-[minmax(180px,1fr)_130px_minmax(140px,1fr)_60px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                                            >
                                                {/* Name */}
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Avatar
                                                        name={member.name}
                                                        size="sm"
                                                        className="size-7 shrink-0 text-xs"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-ink-900">{member.name}</p>
                                                        <p className="truncate text-xs text-ink-600">{member.email}</p>
                                                    </div>
                                                </div>

                                                {/* Role */}
                                                <Badge label={role.label} tone={role.tone} icon={role.icon} />

                                                {/* Status */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                                    {!member.last_login_at && member.role !== 'student' && (
                                                        <Badge label="Invited" tone="neutral" icon={Mail} />
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setManagingUser(member)}
                                                        disabled={isSelf}
                                                        aria-label={`Manage ${member.name}`}
                                                        className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-40"
                                                    >
                                                        <Settings2 className="size-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {managingUser && <ManageUserModal user={managingUser} onClose={() => setManagingUser(null)} />}
            {isAddingUser && <AddUserModal onClose={() => setIsAddingUser(false)} />}
        </div>
    );
}
