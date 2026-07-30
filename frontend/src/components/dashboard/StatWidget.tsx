import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import { BarsAccent } from '@/components/ui/BarsAccent';
import { cn } from '@/lib/utils';

const ICON_CLASSES: Record<BadgeTone, string> = {
    success: 'bg-success-600/10 text-success-600',
    progress: 'bg-blue-600/10 text-blue-600',
    neutral: 'bg-ink-300/20 text-ink-600',
    warning: 'bg-amber-100 text-amber-500',
    danger: 'bg-danger-600/10 text-danger-600',
};

interface StatWidgetProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    tone: BadgeTone;
}

/**
 * Compact SaaS-style stat widget for the admin dashboard's Quick Stats section — icon in a
 * subtle circular chip, thin neutral border, soft shadow that lifts slightly on hover.
 * Deliberately no left/top color border, no gradient, no heavy shadow (ui-context.md's existing
 * tone tokens still carry the meaning, just via the icon chip instead of a border). Every card
 * reserves the same sub-text line height (via `&nbsp;` when `sub` is absent) so cards stay a
 * consistent size across the grid regardless of which ones have subtext.
 * No trend arrow or real sparkline: the dashboard API only returns current-moment counts, nothing
 * time-series, so there's no real data to back either — confirmed with the user rather than
 * fabricated. `BarsAccent` is a fixed decorative flourish only, not a data visualization.
 */
export function StatWidget({ icon: Icon, label, value, sub, tone }: StatWidgetProps) {
    return (
        <div
            className={cn(
                'rounded-xl border border-surface-100 bg-surface-0 p-4',
                'shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', ICON_CLASSES[tone])}>
                        <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-medium text-ink-600">{label}</span>
                </div>
                <BarsAccent />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
            <p className="mt-0.5 truncate text-xs text-ink-600">{sub || ' '}</p>
        </div>
    );
}
