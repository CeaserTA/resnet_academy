import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const generatedId = useId();
        const textareaId = id ?? generatedId;

        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={textareaId} className="text-sm font-medium text-ink-900">
                    {label}
                </label>
                <textarea
                    ref={ref}
                    id={textareaId}
                    aria-invalid={!!error}
                    className={cn(
                        'rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900',
                        'shadow-sm placeholder:text-ink-300',
                        // One focus indicator only: the ring token (no outline, no border colour change).
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-danger-600',
                        className,
                    )}
                    {...props}
                />
                {error && <p className="text-sm text-danger-600">{error}</p>}
            </div>
        );
    },
);

Textarea.displayName = 'Textarea';
