import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<BadgeTone, { icon: string; value: string }> = {
    success: {
        icon: 'bg-success-600/10 text-success-600',
        value: 'text-success-600',
    },
    progress: {
        icon: 'bg-blue-600/10 text-blue-600',
        value: 'text-blue-600',
    },
    neutral: {
        icon: 'bg-ink-300/15 text-ink-600',
        value: 'text-ink-900',
    },
    warning: {
        icon: 'bg-amber-100 text-amber-600',
        value: 'text-amber-700',
    },
    danger: {
        icon: 'bg-danger-600/10 text-danger-600',
        value: 'text-danger-600',
    },
    info: {
        icon: 'bg-cyan-600/10 text-cyan-600',
        value: 'text-cyan-600',
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
                'rounded-xl border border-surface-100 bg-surface-0 p-4',
                'shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
            )}
        >
            {/* Icon chip */}
            <span
                className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg',
                    t.icon,
                )}
            >
                <Icon className="size-4" aria-hidden="true" />
            </span>

            {/* Value */}
            <p className={cn('mt-3 text-2xl font-bold tracking-tight', t.value)}>{value}</p>

            {/* Label */}
            <p className="mt-0.5 text-xs font-medium text-ink-600">{label}</p>

            {/* Sub-text */}
            {sub && <p className="mt-0.5 truncate text-xs text-ink-300">{sub}</p>}
        </div>
    );
}
