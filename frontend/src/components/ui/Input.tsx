import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-ink-900">
                {label}
            </label>
            <input
                ref={ref}
                id={inputId}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={cn(
                    'rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
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
});

Input.displayName = 'Input';
