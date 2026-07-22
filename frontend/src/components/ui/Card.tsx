import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-lg border border-surface-100 bg-surface-0 p-5 transition-shadow hover:shadow-md',
                className,
            )}
            {...props}
        />
    );
}
