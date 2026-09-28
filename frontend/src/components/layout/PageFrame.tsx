import type { ReactNode } from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import { cn } from '@/lib/utils';

const WIDTHS = {
    /** Reading, forms, single-column pages. */
    narrow: 'max-w-3xl',
    /** Most content pages (course player, assignment, file resources). */
    default: 'max-w-5xl',
    /** Dashboards and split layouts. */
    full: '',
} as const;

interface PageFrameProps {
    width?: keyof typeof WIDTHS;
    breadcrumbs?: BreadcrumbItem[];
    title: ReactNode;
    subtitle?: ReactNode;
    /** Shown right after the title, e.g. a "Completed" badge. */
    titleAdornment?: ReactNode;
    /** Right-aligned header actions (buttons, progress). */
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}

/**
 * Shared frame for student-facing pages: centred container, breadcrumb, and the same header as
 * the My courses dashboard (title, optional grey subtitle, actions on the right). Content blocks
 * sit 20px below the header and 20px apart (like My courses), so pages shouldn't add their own
 * top margins to their top-level blocks.
 */
export function PageFrame({
    width = 'default',
    breadcrumbs,
    title,
    subtitle,
    titleAdornment,
    actions,
    className,
    children,
}: PageFrameProps) {
    return (
        <div className={cn('mx-auto w-full', WIDTHS[width], className)}>
            {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

            <div className={cn('flex flex-wrap items-center justify-between gap-3', breadcrumbs && 'mt-2')}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
                        {titleAdornment}
                    </div>
                    {subtitle && <p className="text-xs text-ink-600">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            <div className="mt-5 space-y-5">{children}</div>
        </div>
    );
}
