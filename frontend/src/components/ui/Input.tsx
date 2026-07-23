import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, type = 'text', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-ink-900">
                {label}
            </label>

            <InputPrimitive
                ref={ref}
                id={inputId}
                type={type}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                data-slot="input"
                className={cn(
                    'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
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
