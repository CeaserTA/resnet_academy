import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginatedResponse } from '@/lib/api/types';

interface PaginationProps {
    meta: PaginatedResponse<unknown>['meta'];
    onPageChange: (page: number) => void;
    /** Plural noun for the total, e.g. "orders" → "Page 1 of 3 · 120 orders". */
    itemLabel: string;
}

/**
 * Footer pager for server-paginated tables (Laravel `meta`). Same markup as the Enrolments
 * roster pager; renders nothing when everything fits on one page.
 */
export function Pagination({ meta, onPageChange, itemLabel }: PaginationProps) {
    if (meta.last_page <= 1) return null;

    return (
        <nav aria-label="Pagination" className="flex items-center justify-between border-t border-surface-100 px-4 py-2.5">
            <p className="text-xs text-ink-600">
                Page {meta.current_page} of {meta.last_page} · {meta.total} {itemLabel}
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, meta.current_page - 1))}
                    disabled={meta.current_page <= 1}
                    aria-label="Previous page"
                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 disabled:opacity-40"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(meta.last_page, meta.current_page + 1))}
                    disabled={meta.current_page >= meta.last_page}
                    aria-label="Next page"
                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 disabled:opacity-40"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
