import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedTab<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
}

interface SegmentedTabsProps<T extends string> {
    tabs: readonly SegmentedTab<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Accessible name for the tab list, e.g. "Course sections". */
    label: string;
    className?: string;
}

/**
 * The app's tab pattern: a grey rounded track with the active tab as a solid blue pill — the
 * same markup Applications, Reviews, Payments, Support etc. use inline. Carries tablist/tab
 * roles and aria-selected so the active tab is announced.
 */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, label, className }: SegmentedTabsProps<T>) {
    return (
        <div
            role="tablist"
            aria-label={label}
            className={cn('flex w-fit max-w-full items-center gap-0.5 self-start overflow-x-auto rounded-lg border border-surface-100 bg-surface-50 p-0.5', className)}
        >
            {tabs.map(({ value: tabValue, label: tabLabel, icon: Icon }) => {
                const active = tabValue === value;
                return (
                    <button
                        key={tabValue}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tabValue)}
                        className={cn(
                            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            active ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
                        )}
                    >
                        {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                        {tabLabel}
                    </button>
                );
            })}
        </div>
    );
}
