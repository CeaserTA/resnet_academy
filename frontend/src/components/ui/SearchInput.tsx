import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Accessible name when it should say more than the placeholder. */
    label?: string;
    className?: string;
}

/**
 * The toolbar search box used on admin list pages (Enrolments, Team, Applications, Reviews):
 * right-aligned in the filter row, full width on phones. Filtering itself stays with each page.
 */
export function SearchInput({ value, onChange, placeholder, label, className }: SearchInputProps) {
    return (
        <div className={cn('relative ml-auto w-full max-w-56', className)}>
            <Search className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-600" aria-hidden="true" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label ?? placeholder}
                className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-ink-900 transition focus-visible:bg-surface-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
        </div>
    );
}
