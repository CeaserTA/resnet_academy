import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api/client';
import { requestPasswordReset } from '@/features/auth/api';

const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: FormValues) => {
        setFormError(null);

        try {
            await requestPasswordReset(values.email);
            setSent(true);
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.');
        }
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
            <div className="text-center">
                <h1 className="text-2xl">Reset your password</h1>
                <p className="mt-1 text-sm text-ink-600">We’ll email you a link to set a new one.</p>
            </div>

            <Card>
                {sent ? (
                    <Alert variant="success" message="If that email is registered, a reset link is on its way." />
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                        {formError && <Alert variant="error" message={formError} />}
                        <Input
                            label="Email"
                            type="email"
                            autoComplete="email"
                            error={errors.email?.message}
                            {...register('email')}
                        />
                        <Button type="submit" isLoading={isSubmitting}>
                            Send reset link
                        </Button>
                    </form>
                )}
            </Card>

            <p className="text-center text-sm">
                <Link to="/login" className="text-blue-600 hover:underline">
                    Back to log in
                </Link>
            </p>
        </div>
    );
}
