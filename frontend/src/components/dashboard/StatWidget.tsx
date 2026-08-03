import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<BadgeTone, { icon: string; border: string; value: string }> = {
    success: {
        icon: 'bg-success-600/10 text-success-600',
        border: 'border-l-success-600',
        value: 'text-success-600',
    },
    progress: {
        icon: 'bg-blue-600/10 text-blue-600',
        border: 'border-l-blue-600',
        value: 'text-blue-600',
    },
    neutral: {
        icon: 'bg-ink-300/15 text-ink-600',
        border: 'border-l-ink-300',
        value: 'text-ink-900',
    },
    warning: {
        icon: 'bg-amber-100 text-amber-600',
        border: 'border-l-amber-500',
        value: 'text-amber-700',
    },
    danger: {
        icon: 'bg-danger-600/10 text-danger-600',
        border: 'border-l-danger-600',
        value: 'text-danger-600',
    },
};

interface StatWidgetProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    tone: BadgeTone;
}

export function StatWidget({ icon: Icon, label, value, sub, tone }: StatWidgetProps) {
    const t = TONE_CLASSES[tone];

    return (
        <div
            className={cn(
                'rounded-xl border border-l-4 border-surface-100 bg-surface-0 p-5',
                'shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                t.border,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        t.icon,
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
            </div>
            <p className={cn('mt-4 text-3xl font-bold tracking-tight', t.value)}>{value}</p>
            <p className="mt-1 text-sm font-medium text-ink-900">{label}</p>
            {sub && <p className="mt-0.5 truncate text-xs text-ink-600">{sub}</p>}
        </div>
    );
}
