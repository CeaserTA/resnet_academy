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
                        'focus-visible:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
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
