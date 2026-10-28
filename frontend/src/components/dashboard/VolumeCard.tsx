import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Quick-stat card used on every overview screen (all three dashboards, My courses, payments).
 * Shared so every quick-stat block stays visually identical. Compacts on phones, where three
 * may sit side by side.
 */

const ACCENT_VALUE: Record<'primary' | 'success' | 'amber', string> = {
    primary: 'text-primary',
    success: 'text-success-600',
    amber: 'text-accent-amber',
};

export function VolumeCard({
    icon: Icon,
    label,
    value,
    sub,
    accentColor,
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    /** Colour for the large value number. Defaults to ink-900 when omitted. */
    accentColor?: 'primary' | 'success' | 'amber';
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface-50 px-4 py-4 shadow-sm transition-all hover:shadow-md sm:gap-2">
            <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-ink-600 sm:text-xs sm:tracking-widest">{label}</p>
                <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-ink-600 sm:flex">
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums sm:text-3xl', accentColor ? ACCENT_VALUE[accentColor] : 'text-ink-900')}>{value}</p>
            {sub && <p className="truncate text-xs text-ink-600">{sub}</p>}
        </div>
    );
}
