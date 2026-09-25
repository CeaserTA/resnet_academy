import { useCountUp } from '@/hooks/useCountUp';

interface StatCardProps {
    /** e.g. '200+' or '6' or '2023' */
    value: string;
    label: string;
    note?: string;
    /** Extra classes for the wrapper */
    className?: string;
}

/**
 * Parses the numeric part from a value like "200+" or "95%",
 * counts up to it on scroll, then re-appends the suffix.
 */
export function StatCard({ value, label, note, className }: StatCardProps) {
    const numeric = parseInt(value.replace(/\D/g, ''), 10);
    const suffix = value.replace(/[\d]/g, ''); // e.g. '+' or '%' or ''
    const { ref, count } = useCountUp(numeric, 1400);

    return (
        <div className={`flex flex-col rounded-xl border border-border bg-surface-50 px-5 py-6 ${className ?? ''}`}>
            <dd
                ref={ref as React.RefObject<HTMLElement>}
                className="text-4xl font-bold text-primary"
            >
                {count}{suffix}
            </dd>
            <dt className="mt-1 text-sm font-medium text-ink-900">{label}</dt>
            {note && <p className="mt-1 text-xs text-ink-300">{note}</p>}
        </div>
    );
}
