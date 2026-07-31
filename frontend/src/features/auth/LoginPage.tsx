import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api/client';
import { googleRedirectUrl } from '@/features/auth/api';

const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);

        try {
            await login(values.email, values.password);
            const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
            navigate(redirectTo, { replace: true });
        } catch (error) {
            if (error instanceof ApiError) {
                setFormError(
                    error.message || 'Those credentials don’t match an account. Check your email and password.',
                );
            } else {
                setFormError('Something went wrong. Try again.');
            }
        }
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
            <div className="text-center">
                <h1 className="text-2xl">Log in</h1>
                <p className="mt-1 text-sm text-ink-600">Welcome back to Resnet LMS.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                    {formError && <Alert variant="error" message={formError} />}

                    <Input
                        label="Email"
                        type="email"
                        autoComplete="email"
                        error={errors.email?.message}
                        {...register('email')}
                    />
                    <Input
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        error={errors.password?.message}
                        {...register('password')}
                    />

                    <Button type="submit" isLoading={isSubmitting}>
                        Log in
                    </Button>

                    <a
                        href={googleRedirectUrl}
                        className="flex items-center justify-center gap-2 rounded-md border border-surface-100 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-surface-50"
                    >
                        Continue with Google
                    </a>
                </form>
            </Card>

            <div className="flex justify-between text-sm">
                <Link to="/forgot-password" className="text-blue-600 hover:underline">
                    Forgot password?
                </Link>
                <Link to="/register" className="text-blue-600 hover:underline">
                    Create an account
                </Link>
            </div>
        </div>
    );
}
