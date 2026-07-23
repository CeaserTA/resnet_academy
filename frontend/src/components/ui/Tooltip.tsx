import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    label: string;
    children: ReactNode;
    className?: string;
}

/** Hover/focus-triggered label for icon-only buttons — no positioning library, just a fixed offset above the trigger. */
export function Tooltip({ label, children, className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span
            className={cn('relative inline-flex', className)}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-xs text-white"
                >
                    {label}
                </span>
            )}
        </span>
    );
}
