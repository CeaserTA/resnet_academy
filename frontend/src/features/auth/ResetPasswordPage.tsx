import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api/client';
import { resetPassword } from '@/features/auth/api';

const schema = z
    .object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        passwordConfirmation: z.string().min(1, 'Confirm your password'),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
        message: 'Passwords don’t match',
        path: ['passwordConfirmation'],
    });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [formError, setFormError] = useState<string | null>(null);

    const token = searchParams.get('token') ?? '';
    const email = searchParams.get('email') ?? '';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);

        try {
            await resetPassword(token, email, values.password, values.passwordConfirmation);
            navigate('/login', { replace: true });
        } catch (error) {
            setFormError(
                error instanceof ApiError ? error.message : 'This reset link is invalid or expired. Request a new one.',
            );
        }
    };

    if (!token || !email) {
        return (
            <div className="mx-auto max-w-md px-4 py-16 text-center">
                <Alert variant="error" message="This reset link is missing information. Request a new one." />
                <Link to="/forgot-password" className="mt-4 inline-block text-blue-600 hover:underline">
                    Request a new link
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
            <div className="text-center">
                <h1 className="text-2xl">Choose a new password</h1>
            </div>

            <Card>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                    {formError && <Alert variant="error" message={formError} />}
                    <Input
                        label="New password"
                        type="password"
                        autoComplete="new-password"
                        error={errors.password?.message}
                        {...register('password')}
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        autoComplete="new-password"
                        error={errors.passwordConfirmation?.message}
                        {...register('passwordConfirmation')}
                    />
                    <Button type="submit" isLoading={isSubmitting}>
                        Reset password
                    </Button>
                </form>
            </Card>
        </div>
    );
}
