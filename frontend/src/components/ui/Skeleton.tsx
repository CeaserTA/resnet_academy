import { cn } from '@/lib/utils';

/** Loading placeholder — a pulsing block, sized/shaped via `className`. */
export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-md bg-surface-100', className)} />;
}
