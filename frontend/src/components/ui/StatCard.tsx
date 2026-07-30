import { Card } from '@/components/ui/Card';
import type { BadgeTone } from '@/components/ui/Badge';
import { BarsAccent } from '@/components/ui/BarsAccent';
import { cn } from '@/lib/utils';

const LABEL_CLASSES: Record<BadgeTone, string> = {
    success: 'text-success-600',
    progress: 'text-blue-600',
    neutral: 'text-ink-600',
    warning: 'text-amber-500',
    danger: 'text-danger-600',
};

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    tone: BadgeTone;
}

/**
 * Plain-bordered stat cards (label, value, optional muted subtext) colored by meaning via the
 * label text, grounded in ui-context.md's existing semantic tokens — no new hues introduced.
 * `warning` (amber) is deliberately reused for both "achievement" (certificates) and "needs
 * attention" (open tickets), same as the design system already does elsewhere, disambiguated by
 * label rather than color alone.
 */
export function StatCard({ label, value, sub, tone }: StatCardProps) {
    return (
        <Card>
            <div className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-sm font-medium', LABEL_CLASSES[tone])}>{label}</span>
                <BarsAccent />
            </div>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-ink-600">{sub}</p>}
        </Card>
    );
}
