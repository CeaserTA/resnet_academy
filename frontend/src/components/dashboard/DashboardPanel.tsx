import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Building blocks shared by the student, instructor and admin dashboards, so every dashboard
 * uses the same panels, section labels and links:
 *   NeedsActionBand — the one tinted block ("act on this");
 *   SectionLabel    — small caps heading above a row of cards;
 *   DashboardPanel  — white card with a grey header row and an optional "View all" link.
 */

export function NeedsActionBand({ children }: { children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-border bg-surface-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Needs action</p>
            {children}
        </section>
    );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
    const label = <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-600">{children}</h2>;
    if (!action) return <div className="mb-2.5">{label}</div>;
    return (
        <div className="mb-2.5 flex items-center justify-between gap-3">
            {label}
            <div className="flex items-center gap-4">{action}</div>
        </div>
    );
}

export function ViewAllLink({ to, label = 'View all' }: { to: string; label?: string }) {
    return (
        <Link to={to} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
            {label} <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
    );
}

export function DashboardPanel({
    title,
    action,
    className,
    children,
}: {
    title: string;
    /** Right side of the header — usually a ViewAllLink. */
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm', className)}>
            <div className="flex items-center justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}
