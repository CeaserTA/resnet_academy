import { Link } from 'react-router';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export interface QuickAction {
    label: string;
    icon: LucideIcon;
    /** Optional second line, e.g. "2 awaiting a decision". */
    description?: string;
    to?: string;
    onClick?: () => void;
}

/** Quick-action row shared by the admin and instructor dashboards. */
export function QuickActionButton({ action }: { action: QuickAction }) {
    const cls = 'flex w-full items-center gap-2.5 rounded-lg border border-surface-100 bg-surface-0 px-3 py-2.5 text-left text-sm font-medium text-ink-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700';
    const inner = (
        <>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/8 text-blue-600">
                <action.icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block">{action.label}</span>
                {action.description && <span className="block truncate text-xs font-normal text-ink-600">{action.description}</span>}
            </span>
            <ArrowRight className="ml-auto size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
        </>
    );
    if (action.to) return <Link to={action.to} className={cls}>{inner}</Link>;
    return <button type="button" onClick={action.onClick} className={cls}>{inner}</button>;
}
