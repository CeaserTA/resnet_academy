import { type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    /** Visually hides the label (e.g. `sr-only`) while keeping it in the accessibility tree — for compact layouts where a visible label would be redundant. */
    labelClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, labelClassName, id, children, ...props }, ref) => {
        const generatedId = useId();
        const selectId = id ?? generatedId;

        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={selectId} className={cn('text-sm font-medium text-ink-900', labelClassName)}>
                    {label}
                </label>
                <select
                    ref={ref}
                    id={selectId}
                    className={cn(
                        'rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                        className,
                    )}
                    {...props}
                >
                    {children}
                </select>
            </div>
        );
    },
);

Select.displayName = 'Select';
