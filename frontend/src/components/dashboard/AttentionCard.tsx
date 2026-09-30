import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    sub: string;
    tone: 'danger' | 'warning' | 'neutral';
    /** Makes the whole card a link. Ignored when `action` is given. */
    to?: string;
    /** An explicit call-to-action button inside the card; the card itself is then not clickable. */
    action?: { label: string; to: string };
}

const ATTENTION_STYLES: Record<AttentionCardProps['tone'], { card: string; icon: string; value: string }> = {
    danger: { card: 'bg-danger-600/5 border-danger-600/15', icon: 'bg-danger-600/10 text-danger-600', value: 'text-danger-600' },
    // accent-amber, not amber-500 — amber-500 is only 2.2:1 on white, too faint for text/icons.
    warning: { card: 'bg-amber-100/50 border-amber-100', icon: 'bg-amber-100 text-accent-amber', value: 'text-accent-amber' },
    neutral: { card: 'bg-surface-0 border-surface-100', icon: 'bg-surface-100 text-ink-600', value: 'text-ink-900' },
};

/**
 * "Needs action" card shared by the admin and instructor dashboards. Tinted only when there is
 * something to do, so the accent colour stays rare and meaningful.
 */
export function AttentionCard({ icon: Icon, label, value, sub, tone, to, action }: AttentionCardProps) {
    const s = ATTENTION_STYLES[tone];
    const inner = (
        <div className={cn('group flex flex-col gap-3 rounded-xl border p-4 shadow-sm', !action && 'transition-all hover:shadow-md', s.card)}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-600">{label}</p>
                <span className={cn('flex size-7 items-center justify-center rounded-lg', s.icon)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', s.value)}>{value}</p>
            <p className="text-xs text-ink-600">{sub}</p>
            {action && (
                <Link
                    to={action.to}
                    className="inline-flex items-center justify-center self-start rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    {action.label}
                </Link>
            )}
        </div>
    );
    if (to && !action) return <Link to={to} className="block">{inner}</Link>;
    return inner;
}
