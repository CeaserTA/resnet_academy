import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type BadgeTone = 'success' | 'progress' | 'neutral' | 'warning' | 'danger';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', {
    variants: {
        tone: {
            success: 'bg-success-600/15 text-success-600',
            progress: 'bg-primary/15 text-primary',
            neutral: 'bg-ink-300/20 text-muted-foreground',
            warning: 'bg-amber-100 text-amber-500',
            danger: 'bg-destructive/15 text-destructive',
        } satisfies Record<BadgeTone, string>,
    },
    defaultVariants: {
        tone: 'neutral',
    },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
    label: string;
    tone: BadgeTone;
    icon?: LucideIcon;
    className?: string;
}

/**
 * Status is never color-only (ui-context.md §1/§8) — icon + label always accompany the color.
 */
export function Badge({ label, tone, icon: Icon, className }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ tone }), className)}>
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {label}
        </span>
    );
}
