import type { LucideIcon } from 'lucide-react';

/**
 * Quick-stat card used on every overview screen (all three dashboards, My courses, payments).
 * Shared so every quick-stat block stays visually identical. Compacts on phones, where three
 * may sit side by side.
 */
export function VolumeCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-surface-100 bg-surface-0 p-3 shadow-sm transition-all hover:shadow-md sm:gap-2 sm:p-4">
            <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-ink-600 sm:text-xs sm:tracking-widest">{label}</p>
                <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-ink-600 sm:flex">
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-ink-900 sm:text-3xl">{value}</p>
            {sub && <p className="truncate text-xs text-ink-600">{sub}</p>}
        </div>
    );
}
