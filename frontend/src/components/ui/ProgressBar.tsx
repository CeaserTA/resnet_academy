import * as RadixProgress from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    percent: number;
    className?: string;
}

/**
 * Built on Radix's Progress for correct `aria-valuenow`/`aria-valuemax` wiring and a real
 * transition on value change, instead of a manually clamped `width` style.
 */
export function ProgressBar({ percent, className }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <RadixProgress.Root
            value={clamped}
            className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-100', className)}
        >
            <RadixProgress.Indicator
                className={cn('h-full w-full transition-all duration-300', clamped >= 100 ? 'bg-success-600' : 'bg-primary')}
                style={{ transform: `translateX(-${100 - clamped}%)` }}
            />
        </RadixProgress.Root>
    );
}
