import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const LABEL_CLASSES: Record<BadgeTone, string> = {
    success: 'text-success-600',
    progress: 'text-blue-600',
    neutral: 'text-ink-600',
    warning: 'text-amber-500',
    danger: 'text-danger-600',
};

interface StatCardProps {
    icon?: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    tone: BadgeTone;
}

/**
 * Plain-bordered stat cards (label, value, optional muted subtext) colored by meaning via the
 * label text, grounded in ui-context.md's existing semantic tokens — no new hues introduced.
 */
export function StatCard({ icon: Icon, label, value, sub, tone }: StatCardProps) {
    return (
        <Card>
            <div className="flex items-center gap-2">
                {Icon && <Icon className={cn('size-4', LABEL_CLASSES[tone])} aria-hidden="true" />}
                <span className={cn('text-sm font-medium', LABEL_CLASSES[tone])}>{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-ink-600">{sub}</p>}
        </Card>
    );
}
