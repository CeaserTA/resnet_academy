import { Download, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/** True for files served from this machine / a private network, which Microsoft's servers can't fetch. */
function isPrivateUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url, window.location.href);
        return hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.test')
            || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
    } catch {
        return false;
    }
}

interface DocumentViewerProps {
    fileUrl: string | null | undefined;
    fileType: 'pdf' | 'pptx' | 'docx' | null | undefined;
    title?: string;
    className?: string;
}

/**
 * In-app preview for the three `document` resource file types. Purely presentational — it does
 * not record progress itself; the caller pairs it with an explicit "Mark as read" action (the
 * same convention reading/SCORM resources use), since merely rendering the preview isn't proof
 * the student reviewed the content.
 *
 * PDFs render natively in an <iframe> — every modern browser has a built-in PDF viewer, so no
 * extra dependency is needed. DOCX/PPTX have no native browser renderer, so they go through
 * Microsoft's free Office Online embed viewer (view.officeapps.live.com), which fetches the file
 * itself and renders it as an image-based preview. That only works because resource files are
 * stored on a genuinely public R2 URL (see MediaStorageService) — Microsoft's servers must be
 * able to reach the file. If the embed fails to load (offline dev environment, or a viewer with
 * no public internet route to Microsoft), the "Open in a new tab" link below is the fallback and
 * always works since it just hits the file's own URL directly.
 */
export function DocumentViewer({ fileUrl, fileType, title, className }: DocumentViewerProps) {
    if (!fileUrl) {
        return null;
    }

    const isOffice = fileType === 'pptx' || fileType === 'docx';
    const embedSrc = isOffice
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
        : fileUrl;

    // Microsoft's viewer can't reach a file on this machine (local dev storage), so rather than
    // its generic error, say why and offer the file directly.
    if (isOffice && isPrivateUrl(fileUrl)) {
        return (
            <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-6 py-10 text-center', className)}>
                <FileText className="size-8 text-blue-600" aria-hidden="true" />
                <div>
                    <p className="text-sm font-medium text-ink-900">
                        {fileType === 'pptx' ? 'Slide' : 'Document'} preview isn&apos;t available for files stored on this computer
                    </p>
                    <p className="text-xs text-ink-600">It appears here once the file is on the public file storage. You can still open it below.</p>
                </div>
                <div className="flex items-center gap-4">
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Open in a new tab
                    </a>
                    <a href={fileUrl} download className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <Download className="size-4" aria-hidden="true" />
                        Download
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-surface-200 bg-surface-50 sm:aspect-video">
                <iframe src={embedSrc} title={title ?? 'Document preview'} className="absolute inset-0 size-full border-0" />
            </div>

            <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 self-start text-sm text-blue-600 hover:underline"
            >
                {fileType === 'pdf' ? (
                    <FileText className="size-4" aria-hidden="true" />
                ) : (
                    <ExternalLink className="size-4" aria-hidden="true" />
                )}
                Open in a new tab
            </a>
        </div>
    );
}
