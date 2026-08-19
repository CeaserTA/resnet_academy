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

const schema = z
    .object({
        name: z.string().min(1, 'Name is required').max(150, 'Name must be 150 characters or fewer'),
        email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        passwordConfirmation: z.string().min(1, 'Confirm your password'),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
        message: 'Passwords don’t match',
        path: ['passwordConfirmation'],
    });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    // Return the student to where they were headed instead of always hitting the dashboard
    const resolveRedirectTarget = (): string => {
        const fromPathname = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
        if (typeof fromPathname === 'string' && fromPathname.startsWith('/')) return fromPathname;

        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) return returnUrl;

        const rawIntent = sessionStorage.getItem('pending_enrolment_intent');
        if (rawIntent) {
            try {
                const intent = JSON.parse(rawIntent) as { courseId?: unknown };
                if (typeof intent.courseId === 'number') return `/courses/${intent.courseId}`;
            } catch {
                // Ignore malformed intent payload
            }
        }

        return '/dashboard';
    };

    const onSubmit = async (values: FormValues) => {
        setFormError(null);

        try {
            await registerUser(values.name, values.email, values.password, values.passwordConfirmation);
            navigate(resolveRedirectTarget(), { replace: true });
        } catch (error) {
            if (error instanceof ApiError && error.fields) {
                Object.entries(error.fields).forEach(([field, messages]) => {
                    if (field === 'name' || field === 'email' || field === 'password') {
                        setError(field, { message: messages[0] });
                    }
                });
                return;
            }

            setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.');
        }
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
            <div className="text-center">
                <h1 className="text-2xl">Create your account</h1>
                <p className="mt-1 text-sm text-ink-600">
                    Students self-register — instructors and admins are invited.
                </p>
            </div>

            <Card>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                    {formError && <Alert variant="error" message={formError} />}

                    <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
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
                        autoComplete="new-password"
                        error={errors.password?.message}
                        {...register('password')}
                    />
                    <Input
                        label="Confirm password"
                        type="password"
                        autoComplete="new-password"
                        error={errors.passwordConfirmation?.message}
                        {...register('passwordConfirmation')}
                    />

                    <Button type="submit" isLoading={isSubmitting}>
                        Create account
                    </Button>

                    <a
                        href={googleRedirectUrl}
                        className="flex items-center justify-center gap-2 rounded-md border border-surface-100 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-surface-50"
                    >
                        Continue with Google
                    </a>
                </form>
            </Card>

            <p className="text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    );
}
