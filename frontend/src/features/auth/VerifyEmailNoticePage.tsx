import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { resendVerificationEmail } from '@/features/auth/api';

/** Seconds before the link can be sent again. */
const RESEND_COOLDOWN = 60;

/**
 * Sends the verification link and confirms it in a small window. While that window is open the
 * page re-checks the account every few seconds, so clicking the link in the email (in another
 * tab or on a phone) moves the student straight on to their dashboard here too.
 */
export function VerifyEmailNoticePage() {
    const { user, refetch } = useAuth();
    const navigate = useNavigate();
    const [isSending, setIsSending] = useState(false);
    const [isSentOpen, setIsSentOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notYet, setNotYet] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const isVerified = Boolean(user?.email_verified_at);

    // Already verified (or just became verified) → straight on.
    useEffect(() => {
        if (isVerified) navigate('/dashboard?verified=1', { replace: true });
    }, [isVerified, navigate]);

    // Watch for the link being clicked elsewhere while the "check your email" window is open.
    useEffect(() => {
        if (!isSentOpen) return;
        const timer = window.setInterval(() => void refetch(), 5000);
        return () => window.clearInterval(timer);
    }, [isSentOpen, refetch]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    const handleSend = async () => {
        setIsSending(true);
        setError(null);
        try {
            await resendVerificationEmail();
            setNotYet(false);
            setIsSentOpen(true);
            setCooldown(RESEND_COOLDOWN);
        } catch (e) {
            setError(
                e instanceof ApiError && e.status !== 500
                    ? e.message
                    : "We couldn't send the email right now. Please try again in a few minutes, or contact support.",
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleCheck = async () => {
        await refetch();
        // If verified, the effect above navigates; otherwise say so.
        setNotYet(true);
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 text-center">
            <MailCheck className="mx-auto size-10 text-blue-600" aria-hidden="true" />
            <h1 className="text-2xl">Verify your email</h1>
            <p className="text-sm text-ink-600">
                To protect your account, confirm that <strong>{user?.email}</strong> belongs to you. We&apos;ll email you a link —
                click it and you&apos;re in.
            </p>

            <Card className="space-y-3">
                {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
                <Button onClick={handleSend} isLoading={isSending} disabled={cooldown > 0} className="w-full">
                    {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send verification link'}
                </Button>
                <Button variant="ghost" onClick={handleCheck} className="w-full">
                    I&apos;ve already verified
                </Button>
                {notYet && !isSentOpen && <p className="text-xs text-ink-600">Not verified yet — open the link in the email first.</p>}
            </Card>

            <Modal
                isOpen={isSentOpen}
                onClose={() => setIsSentOpen(false)}
                title="Check your email"
                footer={
                    <>
                        <Button variant="ghost" onClick={handleSend} disabled={cooldown > 0 || isSending}>
                            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                        </Button>
                        <Button onClick={handleCheck}>I&apos;ve clicked the link</Button>
                    </>
                }
            >
                <div className="space-y-3 text-left text-sm text-ink-900">
                    <p className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden="true" />
                        <span>We sent a verification link to <strong>{user?.email}</strong>.</span>
                    </p>
                    <ol className="list-decimal space-y-1 pl-5 text-ink-600">
                        <li>Open the email from Resnet Academy (check Spam or Promotions too).</li>
                        <li>Click <strong>Verify email address</strong>.</li>
                        <li>This page continues to your dashboard on its own once you have.</li>
                    </ol>
                    {notYet && <Alert variant="warning" message="Not verified yet — the link in the email hasn't been opened." />}
                </div>
            </Modal>
        </div>
    );
}
