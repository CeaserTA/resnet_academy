import type { LucideIcon } from 'lucide-react';

/**
 * Quick-stat card used on admin overview screens (dashboard "Volume" row, payments page).
 * Shared so every admin quick-stat block stays visually identical.
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
        <div className="flex flex-col gap-2 rounded-xl border border-surface-100 bg-surface-0 p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-500">{label}</p>
                <span className="flex size-7 items-center justify-center rounded-lg bg-surface-100 text-ink-400">
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-ink-900">{value}</p>
            {sub && <p className="truncate text-xs text-ink-400">{sub}</p>}
        </div>
    );
}
