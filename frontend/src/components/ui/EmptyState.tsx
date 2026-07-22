import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-3 rounded-lg border border-dashed border-surface-100 py-16 text-center',
                className,
            )}
        >
            <Icon className="size-8 text-ink-300" aria-hidden="true" />
            <div>
                <p className="font-medium text-ink-900">{title}</p>
                <p className="mt-1 text-sm text-ink-600">{description}</p>
            </div>
            {action}
        </div>
    );
}
