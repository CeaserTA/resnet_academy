import { useState } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import { useVerifyCertificate } from '@/features/progress/useProgress';

/**
 * architecture.md §5.4 "certificate verification view" — public, no login required. Anyone
 * holding a printed certificate can type its number and confirm it's genuine.
 */
export function CertificateVerifyPage() {
    const [certificateNumber, setCertificateNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const verify = useVerifyCertificate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await verify.mutateAsync(certificateNumber.trim());
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not verify this certificate.');
        }
    };

    return (
        <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
            <div className="text-center">
                <h1 className="text-2xl">Verify a certificate</h1>
                <p className="mt-1 text-sm text-ink-600">Enter the certificate number printed on the document.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <Alert variant="error" message={error} />}

                    <Input
                        label="Certificate number"
                        placeholder="CERT-XXXXXXXXXXXX"
                        value={certificateNumber}
                        onChange={(e) => setCertificateNumber(e.target.value)}
                        required
                    />

                    <Button type="submit" isLoading={verify.isPending}>
                        Verify
                    </Button>
                </form>

                {verify.data && (
                    <div className="mt-6 flex flex-col gap-2 rounded-md bg-success-600/10 p-4">
                        <div className="flex items-center gap-2 text-success-600">
                            <CheckCircle2 className="size-5" aria-hidden="true" />
                            <span className="font-medium">Valid certificate</span>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-ink-900">
                            <Award className="size-4" aria-hidden="true" />
                            {verify.data.student_name} — {verify.data.course_title}
                        </p>
                        <p className="text-sm text-ink-600">
                            Issued {new Date(verify.data.issued_at).toLocaleDateString()}
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}
