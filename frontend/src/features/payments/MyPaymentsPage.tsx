import { ExternalLink, Receipt } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useMyEnrolments } from '@/features/enrolment/useEnrolments';
import { orderStatusDisplay, paymentSubmissionStatusDisplay } from '@/lib/statusBadge';
import { formatMoney, paidCourseOrders } from '@/lib/finance';
import { formatDate, formatDateTime } from '@/lib/formatDate';
import { cn } from '@/lib/utils';

const HEAD = 'text-xs font-medium uppercase tracking-wide text-ink-600';
const INVOICE_COLS = 'grid-cols-[minmax(160px,1fr)_110px_110px_110px_110px]';
const PAYMENT_COLS = 'grid-cols-[150px_minmax(160px,1fr)_120px_120px_90px]';

/**
 * The student's own invoices (one order per paid course) and the payments submitted against them.
 * Reached from the Dashboard's finance snapshot; the data is the order already attached to each
 * enrolment, so this page makes no requests of its own beyond the enrolments list.
 */
export function MyPaymentsPage() {
    const { data, isLoading } = useMyEnrolments();
    const enrolments = data?.data ?? [];
    const orders = paidCourseOrders(enrolments);
    // An order nested in an enrolment doesn't carry its course; the enrolment does.
    const courseTitle = new Map(enrolments.flatMap((e) => (e.order ? [[e.order.id, e.course.title] as const] : [])));
    const payments = orders
        .flatMap((order) => order.payment_submissions.map((payment) => ({ payment, order })))
        .sort((a, b) => b.payment.created_at.localeCompare(a.payment.created_at));

    return (
        <PageFrame
            title="Payments"
            subtitle="Your invoices and the payments you've made"
            breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Payments' }]}
        >
            {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}

            {!isLoading && orders.length === 0 && (
                <EmptyState icon={Receipt} title="No payments yet" description="Your courses are free — there's nothing to pay." />
            )}

            {orders.length > 0 && (
                <section>
                    <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-600">Invoices</h2>
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="overflow-x-auto">
                            <div className="min-w-[640px]">
                                <div className={cn('grid items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5', INVOICE_COLS)}>
                                    <span className={HEAD}>Course</span>
                                    <span className={cn(HEAD, 'text-right')}>Total</span>
                                    <span className={cn(HEAD, 'text-right')}>Paid</span>
                                    <span className={cn(HEAD, 'text-right')}>Outstanding</span>
                                    <span className={HEAD}>Status</span>
                                </div>
                                <ul className="divide-y divide-surface-100">
                                    {orders.map((order) => {
                                        const status = orderStatusDisplay(order.status);
                                        return (
                                            <li key={order.id} className={cn('grid items-center gap-2 px-4 py-3', INVOICE_COLS)}>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-ink-900">{courseTitle.get(order.id) ?? order.course?.title ?? 'Course'}</p>
                                                    <p className="text-xs text-ink-600">Invoice #{order.id} · {formatDate(order.created_at)}</p>
                                                </div>
                                                <span className="text-right text-sm tabular-nums text-ink-900">{formatMoney(order.amount, order.currency)}</span>
                                                <span className="text-right text-sm tabular-nums text-ink-900">{formatMoney(order.amount_paid, order.currency)}</span>
                                                <span className={cn('text-right text-sm font-semibold tabular-nums', order.remaining_balance > 0 ? 'text-accent-amber' : 'text-ink-900')}>
                                                    {formatMoney(order.remaining_balance, order.currency)}
                                                </span>
                                                <span><Badge label={status.label} tone={status.tone} icon={status.icon} /></span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {orders.length > 0 && (
                <section>
                    <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-600">Payment history</h2>
                    {payments.length === 0 ? (
                        <p className="rounded-xl border border-surface-100 bg-surface-0 px-4 py-3 text-sm text-ink-600 shadow-sm">
                            No payments submitted yet. Submit one from My courses.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                            <div className="overflow-x-auto">
                                <div className="min-w-[640px]">
                                    <div className={cn('grid items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5', PAYMENT_COLS)}>
                                        <span className={HEAD}>Submitted</span>
                                        <span className={HEAD}>Course</span>
                                        <span className={cn(HEAD, 'text-right')}>Amount</span>
                                        <span className={HEAD}>Status</span>
                                        <span className={HEAD}>Receipt</span>
                                    </div>
                                    <ul className="divide-y divide-surface-100">
                                        {payments.map(({ payment, order }) => {
                                            const status = paymentSubmissionStatusDisplay(payment.status);
                                            return (
                                                <li key={payment.id} className={cn('grid items-center gap-2 px-4 py-3', PAYMENT_COLS)}>
                                                    <span className="text-sm text-ink-900">{formatDateTime(payment.created_at)}</span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-ink-900">{courseTitle.get(order.id) ?? order.course?.title ?? 'Course'}</p>
                                                        {payment.status === 'rejected' && payment.rejection_reason && (
                                                            <p className="truncate text-xs text-danger-600">{payment.rejection_reason}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-right text-sm font-semibold tabular-nums text-ink-900">{formatMoney(payment.amount, order.currency)}</span>
                                                    <span><Badge label={status.label} tone={status.tone} icon={status.icon} /></span>
                                                    <a
                                                        href={payment.receipt_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                    >
                                                        View
                                                        <ExternalLink className="size-3.5" aria-hidden="true" />
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </PageFrame>
    );
}
