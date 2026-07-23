import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { resendVerificationEmail } from '@/features/auth/api';

export function VerifyEmailNoticePage() {
    const { user } = useAuth();
    const [sent, setSent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleResend = async () => {
        setIsSending(true);
        try {
            await resendVerificationEmail();
            setSent(true);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 text-center">
            <MailCheck className="mx-auto size-10 text-blue-600" aria-hidden="true" />
            <h1 className="text-2xl">Verify your email</h1>
            <p className="text-sm text-ink-600">
                We sent a verification link to <strong>{user?.email}</strong>. Click it to activate your account.
            </p>

            <Card>
                {sent && (
                    <Alert
                        variant="success"
                        message="Verification email sent again — check your inbox."
                        className="mb-4"
                    />
                )}
                <Button onClick={handleResend} isLoading={isSending} variant="secondary" className="w-full">
                    Resend verification email
                </Button>
            </Card>
        </div>
    );
}
