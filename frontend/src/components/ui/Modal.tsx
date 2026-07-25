import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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

/**
 * Built on Radix's Dialog for real focus trapping, return-focus-on-close, and Escape/overlay-click
 * handling — the hand-rolled version this replaced had none of that (no focus trap at all).
 */
export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-30 bg-ink-900/50 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
                <Dialog.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-30 flex max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-card shadow-lg',
                        'transition-all duration-200 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100',
                        className,
                    )}
                >
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <Dialog.Title className="text-lg text-card-foreground">{title}</Dialog.Title>
                        <Dialog.Close asChild>
                            <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="overflow-y-auto px-5 py-5">{children}</div>

                    {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
