import { Download, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { certificateDownloadUrl } from '@/features/progress/api';

/**
 * Previews a certificate PDF inside the app (student and admin). The frame loads the same
 * download endpoint as the Download button: it renders the PDF on demand, then redirects to the
 * stored file, which the browser's PDF viewer shows inline.
 *
 * Links are rel="noopener" only — the download route needs the session cookie, and "noreferrer"
 * would strip the Referer Sanctum checks (see the same link on My courses).
 */
export function CertificateViewerModal({
    certificate,
    onClose,
}: {
    certificate: { id: number; certificate_number: string; course: { title: string } } | null;
    onClose: () => void;
}) {
    if (!certificate) return null;
    const url = certificateDownloadUrl(certificate.id);

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={certificate.course.title}
            titleAdornment={<span className="font-mono text-xs text-ink-600">{certificate.certificate_number}</span>}
            className="max-w-4xl"
            bodyClassName="p-0"
            footer={
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener">
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            Open in new tab
                        </a>
                    </Button>
                    <Button size="sm" asChild>
                        <a href={url} download={`certificate-${certificate.certificate_number}.pdf`} target="_blank" rel="noopener">
                            <Download className="size-3.5" aria-hidden="true" />
                            Download PDF
                        </a>
                    </Button>
                </div>
            }
        >
            <iframe src={url} title={`Certificate for ${certificate.course.title}`} className="block h-[70vh] w-full bg-surface-50" />
        </Modal>
    );
}
