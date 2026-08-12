import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import * as RadixLabel from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    /** Visually hides the label (e.g. `sr-only`) while keeping it in the accessibility tree. */
    labelClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, labelClassName, id, type = 'text', ...props }, ref) => {
        const generatedId = useId();
        const inputId = id ?? generatedId;

        return (
            <div className="flex flex-col gap-1.5">
                <RadixLabel.Root htmlFor={inputId} className={cn('text-sm font-medium text-ink-900', labelClassName)}>
                    {label}
                </RadixLabel.Root>
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={cn(
                        'rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900',
                        'shadow-sm',
                        'placeholder:text-ink-300',
                        'focus-visible:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-danger-600',
                        className,
                    )}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="text-sm text-danger-600">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';
