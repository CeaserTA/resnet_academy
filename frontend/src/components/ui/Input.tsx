import { type InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import * as RadixLabel from '@radix-ui/react-label';
import { Eye, EyeOff } from 'lucide-react';
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
        // Password fields get a show/hide toggle so people can check what they typed.
        const isPassword = type === 'password';
        const [isRevealed, setIsRevealed] = useState(false);

        return (
            <div className="flex flex-col gap-1.5">
                <RadixLabel.Root htmlFor={inputId} className={cn('text-sm font-medium text-ink-900', labelClassName)}>
                    {label}
                </RadixLabel.Root>
                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        type={isPassword && isRevealed ? 'text' : type}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        className={cn(
                            'w-full rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900',
                            'shadow-sm',
                            'placeholder:text-ink-300',
                            // One focus indicator only: the ring token (no outline, no border colour change).
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            error && 'border-danger-600',
                            className,
                            isPassword && 'pr-10',
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setIsRevealed((shown) => !shown)}
                            aria-label={isRevealed ? 'Hide password' : 'Show password'}
                            aria-pressed={isRevealed}
                            aria-controls={inputId}
                            disabled={props.disabled}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                            {isRevealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                        </button>
                    )}
                </div>
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
