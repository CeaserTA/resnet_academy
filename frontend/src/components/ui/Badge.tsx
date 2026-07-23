import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export type BadgeTone = 'success' | 'progress' | 'neutral' | 'warning' | 'danger';

interface BadgeProps extends VariantProps<typeof badgeVariants> {
    label: string;
    tone?: BadgeTone;
    icon?: LucideIcon;
    className?: string;
}

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
    {
        variants: {
            tone: {
                success: 'bg-success-600/15 text-success-600',
                progress: 'bg-blue-600/15 text-blue-600',
                neutral: 'bg-ink-300/20 text-ink-600',
                warning: 'bg-amber-100 text-amber-500',
                danger: 'bg-danger-600/15 text-danger-600',
            },
            variant: {
                default: 'border border-transparent',
                outline: 'border border-current',
            },
        },
        defaultVariants: {
            tone: 'neutral',
            variant: 'default',
        },
    },
);

/**
 * Status is never color-only (ui-context.md §1/§8) — icon + label always accompany the color.
 */
export function Badge({ label, tone = 'neutral', icon: Icon, className }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ tone, className }))}>
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {label}
        </span>
    );
}
