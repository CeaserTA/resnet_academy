import { ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

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
