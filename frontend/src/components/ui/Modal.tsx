import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-ink-900/50"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className={cn('relative flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-surface-0 shadow-lg', className)}
            >
                <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
                    <h2 id="modal-title" className="text-lg text-ink-900">
                        {title}
                    </h2>
                    <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-600 hover:bg-surface-100">
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="overflow-y-auto px-4 py-4">{children}</div>

                {footer && <div className="flex justify-end gap-2 border-t border-surface-100 px-4 py-3">{footer}</div>}
            </div>
        </div>
    );
}
