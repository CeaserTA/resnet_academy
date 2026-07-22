import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'success' | 'progress' | 'neutral' | 'warning' | 'danger';

interface BadgeProps {
    label: string;
    tone: BadgeTone;
    icon?: LucideIcon;
    className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
    success: 'bg-success-600/15 text-success-600',
    progress: 'bg-blue-600/15 text-blue-600',
    neutral: 'bg-ink-300/20 text-ink-600',
    warning: 'bg-amber-100 text-amber-500',
    danger: 'bg-danger-600/15 text-danger-600',
};

/**
 * Status is never color-only (ui-context.md §1/§8) — icon + label always accompany the color.
 */
export function Badge({ label, tone, icon: Icon, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                toneClasses[tone],
                className,
            )}
        >
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {label}
        </span>
    );
}
