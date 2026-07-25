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
    ({ className, label, error, labelClassName, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id ?? generatedId;

        return (
            <div className="flex flex-col gap-1.5">
                <RadixLabel.Root htmlFor={inputId} className={cn('text-sm font-medium text-foreground', labelClassName)}>
                    {label}
                </RadixLabel.Root>
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={cn(
                        'rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        error && 'border-destructive',
                        className,
                    )}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';
