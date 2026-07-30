import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    to?: string;
}

/**
 * Used inline in a page's own body (the learning pages render their own in-body title + back
 * link rather than going through PageHeaderContext/the top bar) — an item with `to` links back a
 * step, the last item (or any item without `to`) is the current page and renders as plain text.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-600">
            {items.map((item, index) => (
                <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
                    {item.to ? (
                        <Link to={item.to} className="hover:text-blue-600 hover:underline">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-ink-900">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
