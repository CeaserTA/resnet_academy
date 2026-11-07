import type { ReactNode } from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { cn } from '@/lib/utils';

const WIDTHS = {
    /** Same full width as the admin pages — dashboards, lists, course pages, forms. */
    full: '',
    /** Long-form reading and quiz taking, where very long lines are hard to read. */
    reading: 'mx-auto max-w-3xl',
} as const;

interface PageFrameProps {
    width?: keyof typeof WIDTHS;
    breadcrumbs?: BreadcrumbItem[];
    /** Shown in the top bar, like every admin page. */
    title: string;
    subtitle?: string;
    /** Shown next to the breadcrumb, e.g. a "Completed" badge. */
    titleAdornment?: ReactNode;
    /** Right-aligned page actions (buttons, progress). */
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}

/**
 * Shared frame for student-facing pages. The title and subtitle go to the app's top bar (as on
 * every admin page); the page itself starts with one row — breadcrumb on the left, actions on the
 * right — then content blocks 20px apart. Pages shouldn't add their own top margins to those blocks.
 */
export function PageFrame({
    width = 'full',
    breadcrumbs,
    title,
    subtitle,
    titleAdornment,
    actions,
    className,
    children,
}: PageFrameProps) {
    usePageHeader(title, subtitle);
    const hasToolbar = Boolean(breadcrumbs || titleAdornment || actions);

    return (
        <div className={cn('w-full', WIDTHS[width], className)}>
            {hasToolbar && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
                        {titleAdornment}
                    </div>
                    {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}

            <div className="space-y-5">{children}</div>
        </div>
    );
}
