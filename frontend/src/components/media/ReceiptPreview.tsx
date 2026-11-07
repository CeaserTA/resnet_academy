import { useState } from 'react';
import { FileWarning, ImageIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

function isPdf(url: string): boolean {
    return /\.pdf($|\?)/i.test(url);
}

/**
 * A payment receipt shown in place — image or PDF — instead of opening the raw storage URL in a
 * new tab. If the file can't be loaded (e.g. it never reached storage) it says so plainly.
 */
export function ReceiptPreview({ url, className }: { url: string; className?: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-surface-100 bg-surface-50 p-6 text-center', className)}>
                <FileWarning className="size-8 text-accent-amber" aria-hidden="true" />
                <p className="text-sm font-medium text-ink-900">This receipt file couldn&apos;t be loaded</p>
                <p className="text-xs text-ink-600">The upload may not have reached storage. Ask the student to resubmit it, or check with the developer.</p>
            </div>
        );
    }

    if (isPdf(url)) {
        return <iframe src={url} title="Payment receipt" className={cn('h-[65vh] w-full rounded-md border border-surface-100', className)} />;
    }

    return (
        <img
            src={url}
            alt="Payment receipt"
            onError={() => setFailed(true)}
            className={cn('max-h-[70vh] w-full rounded-md bg-surface-50 object-contain', className)}
        />
    );
}

/** Small receipt thumbnail that opens the receipt in a window on click. */
export function ReceiptThumbnailButton({ url, studentName }: { url: string | null | undefined; studentName?: string }) {
    const [open, setOpen] = useState(false);
    const [failed, setFailed] = useState(false);

    if (!url) {
        return (
            <span className="flex size-10 items-center justify-center rounded-md bg-surface-100 text-ink-300" aria-label="No receipt submitted yet">
                <ImageIcon className="size-4" aria-hidden="true" />
            </span>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={studentName ? `View receipt from ${studentName}` : 'View receipt'}
                className="block size-10 overflow-hidden rounded-md border border-surface-100 bg-surface-50 transition hover:ring-2 hover:ring-blue-200"
            >
                {failed || isPdf(url) ? (
                    <span className="flex size-full items-center justify-center text-ink-600">
                        {failed ? <FileWarning className="size-4 text-accent-amber" aria-hidden="true" /> : <span className="text-[10px] font-semibold">PDF</span>}
                    </span>
                ) : (
                    <img src={url} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
                )}
            </button>
            <ReceiptViewerModal url={open ? url : null} title={studentName ? `Receipt · ${studentName}` : 'Receipt'} onClose={() => setOpen(false)} />
        </>
    );
}

export function ReceiptViewerModal({ url, title = 'Receipt', onClose }: { url: string | null; title?: string; onClose: () => void }) {
    if (!url) return null;
    return (
        <Modal isOpen onClose={onClose} title={title} className="max-w-2xl">
            <ReceiptPreview url={url} />
        </Modal>
    );
}
