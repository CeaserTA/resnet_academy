import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Plus, Settings2, Users } from 'lucide-react';
import { useProvisionUser, useUpdateUser, useUsers } from '@/features/admin/users/useAdminUsers';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { userRoleDisplay, userStatusDisplay } from '@/lib/statusBadge';
import type { User, UserRole, UserStatus } from '@/lib/api/types';

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
    const { data: users, isLoading } = useUsers();
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);

    return (
        <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl">Team</h1>
                    <p className="mt-1 text-sm text-ink-600">Every user in the system, and their role.</p>
                </div>
                <Button onClick={() => setIsAddingUser(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add user
                </Button>
            </div>

            <div className="mt-6">
                {isLoading && <Spinner className="mt-3" />}

                {!isLoading && users?.length === 0 && (
                    <EmptyState icon={Users} title="No users yet" description="Everyone in the system appears here." className="mt-3" />
                )}

                {!isLoading && users && users.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-100 text-left">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-ink-600">Name</th>
                                    <th className="px-4 py-2 font-medium text-ink-600">Role</th>
                                    <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                    <th className="px-4 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((member, index) => {
                                    const role = userRoleDisplay(member.role);
                                    const status = userStatusDisplay(member.status);
                                    const isSelf = member.id === currentUser?.id;

                                    return (
                                        <tr key={member.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                            <td className="px-4 py-3">
                                                <p className="text-ink-900">{member.name}</p>
                                                <p className="text-xs text-ink-600">{member.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge label={role.label} tone={role.tone} icon={role.icon} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                                    {!member.last_login_at && member.role !== 'student' && (
                                                        <Badge label="Invited" tone="neutral" icon={Mail} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setManagingUser(member)}
                                                    disabled={isSelf}
                                                    aria-label={`Manage ${member.name}`}
                                                >
                                                    <Settings2 className="size-4" aria-hidden="true" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {managingUser && <ManageUserModal user={managingUser} onClose={() => setManagingUser(null)} />}
            {isAddingUser && <AddUserModal onClose={() => setIsAddingUser(false)} />}
        </div>
    );
}
