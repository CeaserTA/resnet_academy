import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Users } from 'lucide-react';
import { useProvisionUser, useUpdateUser, useUsers } from '@/features/admin/users/useAdminUsers';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserRole, UserStatus } from '@/lib/api/types';

const schema = z.object({
    name: z.string().min(1, 'Name is required').max(150),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['instructor', 'admin']),
});

type FormValues = z.infer<typeof schema>;

export function ProvisionUserPage() {
    const { user: currentUser } = useAuth();
    const { data: team, isLoading } = useUsers();
    const provisionUser = useProvisionUser();
    const updateUser = useUpdateUser();
    const [formError, setFormError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'instructor' } });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);
        setSuccess(false);

        try {
            await provisionUser.mutateAsync(values);
            setSuccess(true);
            reset();
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not create the account.');
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl">Team</h1>
            <p className="mt-1 text-sm text-ink-600">
                Invite-provision instructor and admin accounts — students self-register.
            </p>

            <Card className="mt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                    {formError && <Alert variant="error" message={formError} />}
                    {success && <Alert variant="success" message="Account created." />}

                    <Input label="Full name" error={errors.name?.message} {...register('name')} />
                    <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                    <Input
                        label="Temporary password"
                        type="password"
                        error={errors.password?.message}
                        {...register('password')}
                    />
                    <Select label="Role" {...register('role')}>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                    </Select>

                    <Button type="submit" isLoading={isSubmitting}>
                        <UserPlus className="size-4" aria-hidden="true" />
                        Create account
                    </Button>
                </form>
            </Card>

            <div className="mt-8">
                <h2 className="text-lg">Existing team members</h2>
                {!isLoading && team?.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title="No team members yet"
                        description="Provisioned instructors and admins appear here."
                        className="mt-3"
                    />
                )}
                {!isLoading && team && team.length > 0 && (
                    <ul className="mt-3 divide-y divide-surface-100 rounded-lg border border-surface-100 bg-surface-0">
                        {team
                            .filter((member) => member.role !== 'student')
                            .map((member) => {
                                const isSelf = member.id === currentUser?.id;

                                return (
                                    <li
                                        key={member.id}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="text-ink-900">{member.name}</p>
                                            <p className="text-sm text-ink-600">{member.email}</p>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <Select
                                                label={`Role — ${member.name}`}
                                                labelClassName="sr-only"
                                                value={member.role}
                                                disabled={isSelf || updateUser.isPending}
                                                onChange={(e) =>
                                                    updateUser.mutate({ userId: member.id, role: e.target.value as UserRole })
                                                }
                                                className="py-1 text-sm"
                                            >
                                                <option value="instructor">Instructor</option>
                                                <option value="admin">Admin</option>
                                            </Select>
                                            <Select
                                                label={`Status — ${member.name}`}
                                                labelClassName="sr-only"
                                                value={member.status}
                                                disabled={isSelf || updateUser.isPending}
                                                onChange={(e) =>
                                                    updateUser.mutate({ userId: member.id, status: e.target.value as UserStatus })
                                                }
                                                className="py-1 text-sm"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                                <option value="deactivated">Deactivated</option>
                                            </Select>
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </div>
        </div>
    );
}
