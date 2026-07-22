import { cn } from '@/lib/utils';

interface ProgressBarProps {
    percent: number;
    className?: string;
}

export function ProgressBar({ percent, className }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-100', className)}
        >
            <div
                className={cn('h-full transition-all', clamped >= 100 ? 'bg-success-600' : 'bg-blue-600')}
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}
