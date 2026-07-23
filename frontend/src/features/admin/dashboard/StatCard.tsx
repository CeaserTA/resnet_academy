import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const TONE_CLASSES: Record<BadgeTone, { border: string; chip: string; icon: string }> = {
    success: { border: 'border-l-success-600', chip: 'bg-success-600/10', icon: 'text-success-600' },
    progress: { border: 'border-l-blue-600', chip: 'bg-blue-600/10', icon: 'text-blue-600' },
    neutral: { border: 'border-l-ink-300', chip: 'bg-ink-300/15', icon: 'text-ink-600' },
    warning: { border: 'border-l-amber-500', chip: 'bg-amber-100', icon: 'text-amber-500' },
    danger: { border: 'border-l-danger-600', chip: 'bg-danger-600/10', icon: 'text-danger-600' },
};

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    tone: BadgeTone;
}

/**
 * Stat cards colored by meaning, grounded in ui-context.md's existing semantic tokens — no new
 * hues introduced. `warning` (amber) is deliberately reused for both "achievement" (certificates)
 * and "needs attention" (open tickets), same as the design system already does elsewhere,
 * disambiguated by icon + label rather than color alone.
 */
export function StatCard({ icon: Icon, label, value, sub, tone }: StatCardProps) {
    const classes = TONE_CLASSES[tone];

    return (
        <Card className={cn('border-l-4', classes.border)}>
            <div className="flex items-center gap-2">
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', classes.chip)}>
                    <Icon className={cn('size-4', classes.icon)} aria-hidden="true" />
                </span>
                <span className="text-sm text-ink-600">{label}</span>
            </div>
            <p className="mt-2 font-mono text-2xl text-ink-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-ink-600">{sub}</p>}
        </Card>
    );
}
