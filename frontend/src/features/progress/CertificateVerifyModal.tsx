import { useState } from 'react';
import { Award, CheckCircle2, SearchX } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import { useVerifyCertificate } from '@/features/progress/useProgress';

interface CertificateVerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Pre-fills the field and runs the lookup straight away. Set when the visitor arrived by
     * scanning the QR code printed on a certificate, where the number is already known and
     * retyping it would defeat the point of the code.
     */
    initialNumber?: string | null;
}

/**
 * architecture.md §5.4 "certificate verification view" — public, no login required. Anyone
 * holding a printed certificate (typically an employer) types its number to confirm it's genuine.
 */
export function CertificateVerifyModal({ isOpen, onClose, initialNumber }: CertificateVerifyModalProps) {
    const [certificateNumber, setCertificateNumber] = useState(initialNumber?.trim() ?? '');
    // What the visitor has actually asked about, as opposed to what they are still typing. Seeded
    // from the QR code's number so that arriving by scan looks the result up without a click.
    const [submitted, setSubmitted] = useState(initialNumber?.trim() ?? '');
    const verify = useVerifyCertificate(submitted);

    const handleClose = () => {
        // Reopening should start blank, not show the last visitor's lookup.
        setCertificateNumber('');
        setSubmitted('');
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(certificateNumber.trim());
    };

    // A 404 is the expected "this certificate does not exist" answer — a result for the visitor,
    // not a system failure — so it gets its own outcome rather than a red error box.
    const notFound = verify.error instanceof ApiError && verify.error.status === 404;
    const failed = verify.isError && !notFound;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Verify a certificate" className="max-w-md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-sm text-ink-600">Enter the certificate number printed on the document.</p>

                {failed && <Alert variant="error" message="We couldn’t check that certificate right now. Please try again." />}

                <Input
                    label="Certificate number"
                    placeholder="CERT-XXXXXXXXXXXX"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    autoFocus
                    required
                />

                <Button type="submit" isLoading={verify.isFetching}>
                    Verify
                </Button>
            </form>

            {verify.data && !verify.isFetching && (
                <div className="mt-4 flex flex-col gap-2 rounded-md bg-success-600/10 p-4" role="status">
                    <div className="flex items-center gap-2 text-success-600">
                        <CheckCircle2 className="size-5" aria-hidden="true" />
                        <span className="font-medium">Valid certificate</span>
                    </div>
                    <p className="flex items-center gap-2 text-sm text-ink-900">
                        <Award className="size-4" aria-hidden="true" />
                        {verify.data.student_name} — {verify.data.course_title}
                    </p>
                    <p className="font-mono text-xs text-ink-600">{verify.data.certificate_number}</p>
                    <p className="text-sm text-ink-600">Issued {new Date(verify.data.issued_at).toLocaleDateString()}</p>
                </div>
            )}

            {notFound && (
                <div className="mt-4 flex flex-col gap-2 rounded-md bg-danger-600/10 p-4" role="status">
                    <div className="flex items-center gap-2 text-danger-600">
                        <SearchX className="size-5" aria-hidden="true" />
                        <span className="font-medium">No matching certificate</span>
                    </div>
                    <p className="text-sm text-ink-900">
                        We couldn’t find a certificate with that number, so it can’t be verified. Check it matches the
                        number printed on the certificate exactly.
                    </p>
                </div>
            )}
        </Modal>
    );
}
