import { useState } from 'react';
import { Check, CheckCircle2, CircleDollarSign, CreditCard, Eye, Hourglass, Image as ImageIcon, ReceiptText, Wallet, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { cn } from '@/lib/utils';
import {
    useConfirmPaymentSubmission,
    useOrders,
    usePaymentSummary,
    useRejectPaymentSubmission,
    useUpdateOrder,
} from '@/features/admin/payments/useAdminPayments';
import { orderStatusDisplay, paymentSubmissionStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { Order, OrderStatus, PaymentSummaryCurrency } from '@/lib/api/types';

type Tab = OrderStatus;

const TABS: [Tab, string][] = [
    ['pending', 'Receivables'],
    ['partial', 'Partials'],
    ['paid', 'Paid'],
];

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

// Same compact K/M formatting as the admin dashboard's Revenue card, so the quick
// stats read identically on both screens.
function formatCurrencyCompact(amount: number, currency: string): string {
    if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function PaymentQuickStats() {
    const { data } = usePaymentSummary();
    const byCurrency = data?.by_currency ?? [];

    const totalOrders = byCurrency.reduce((sum, row) => sum + row.orders, 0);
    const expectedTotal = byCurrency.reduce((sum, row) => sum + row.expected, 0);
    const receivedTotal = byCurrency.reduce((sum, row) => sum + row.received, 0);
    const collectedPercent = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : null;

    // One formatted amount per currency (multi-currency joins, single-currency stays clean)
    const statValue = (field: keyof Pick<PaymentSummaryCurrency, 'expected' | 'received' | 'outstanding'>): string =>
        byCurrency.length > 0 ? byCurrency.map((row) => formatCurrencyCompact(row[field], row.currency)).join('  ') : '—';

    return (
        <section>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-400">Quick stats</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <VolumeCard
                    icon={CircleDollarSign}
                    label="Expected to collect"
                    value={statValue('expected')}
                    sub={byCurrency.length > 0 ? `${totalOrders} orders invoiced` : 'No orders yet'}
                />
                <VolumeCard
                    icon={Wallet}
                    label="Received"
                    value={statValue('received')}
                    sub={collectedPercent !== null ? `${collectedPercent}% of expected` : undefined}
                />
                <VolumeCard
                    icon={Hourglass}
                    label="Outstanding"
                    value={statValue('outstanding')}
                    sub={collectedPercent !== null ? `${100 - collectedPercent}% of expected` : undefined}
                />
            </div>
        </section>
    );
}

function ViewOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const status = orderStatusDisplay(order.status);
    const latestSubmission = order.payment_submissions[0] ?? null;

    const rows: [string, string][] = [
        ['Student', order.student ? `${order.student.name} (${order.student.email})` : '—'],
        ['Course', order.course?.title ?? '—'],
        ['Amount owed', formatAmount(order.amount, order.currency)],
        ['Amount paid', formatAmount(order.amount_paid, order.currency)],
        ['Remaining balance', formatAmount(order.remaining_balance, order.currency)],
        ['Payment method', order.payment_method ?? '—'],
        ['Provider reference', order.provider_ref ?? '—'],
        ['Paid at', order.paid_at ? new Date(order.paid_at).toLocaleString() : '—'],
        ['Created at', new Date(order.created_at).toLocaleString()],
    ];

    return (
        <Modal isOpen onClose={onClose} title={`Order #${order.id}`}>
            {latestSubmission ? (
                <a href={latestSubmission.receipt_url} target="_blank" rel="noreferrer">
                    <img
                        src={latestSubmission.receipt_url}
                        alt="Payment receipt"
                        className="aspect-video w-full rounded-md object-cover"
                    />
                </a>
            ) : (
                <>
                    <div className="flex aspect-video items-center justify-center rounded-md bg-surface-100 text-ink-300">
                        <ImageIcon className="size-8" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-center text-xs text-ink-600">No payment submitted yet</p>
                </>
            )}

            <div className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-ink-600">Status</span>
                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                </div>
                {rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                        <span className="text-ink-600">{label}</span>
                        <span className="text-right text-ink-900">{value}</span>
                    </div>
                ))}
            </div>

            {order.payment_submissions.length > 0 && (
                <div className="mt-4 border-t border-surface-100 pt-3">
                    <p className="text-sm font-medium text-ink-900">Payment history</p>
                    <ul className="mt-2 flex flex-col gap-2">
                        {order.payment_submissions.map((submission) => {
                            const submissionStatus = paymentSubmissionStatusDisplay(submission.status);

                            return (
                                <li key={submission.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-ink-600">{new Date(submission.created_at).toLocaleDateString()}</span>
                                    <span className="font-mono text-ink-900">{formatAmount(submission.amount, order.currency)}</span>
                                    <Badge label={submissionStatus.label} tone={submissionStatus.tone} icon={submissionStatus.icon} />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </Modal>
    );
}

function ReviewPaymentModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const updateOrder = useUpdateOrder();
    const [amountPaid, setAmountPaid] = useState(order.amount_paid);
    const [paymentMethod, setPaymentMethod] = useState(order.payment_method ?? '');

    const handleSave = async () => {
        await updateOrder.mutateAsync({ orderId: order.id, amount_paid: Number(amountPaid), payment_method: paymentMethod || null });
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Review payment — order #${order.id}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={updateOrder.isPending}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-600">
                    Amount owed: <span className="font-medium text-ink-900">{formatAmount(order.amount, order.currency)}</span>
                </p>

                <Input
                    label={`Amount paid (${order.currency})`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                />

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Payment method</span>
                    <input
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        placeholder="e.g. mobile_money, card"
                        className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </label>
            </div>
        </Modal>
    );
}

function ReceiptCell({ order }: { order: Order }) {
    if (order.pending_submission) {
        return (
            <a href={order.pending_submission.receipt_url} target="_blank" rel="noreferrer">
                <img
                    src={order.pending_submission.receipt_url}
                    alt="Submitted receipt"
                    className="size-10 rounded-md object-cover"
                />
            </a>
        );
    }

    return (
        <span
            className="flex size-10 items-center justify-center rounded-md bg-surface-100 text-ink-300"
            aria-label="No receipt submitted yet"
        >
            <ImageIcon className="size-4" aria-hidden="true" />
        </span>
    );
}

export function PaymentsPage() {
    usePageHeader('Payments', 'Every order across every student.');
    const [tab, setTab] = useState<Tab>('pending');
    const { data, isLoading } = useOrders(tab);
    const confirmSubmission = useConfirmPaymentSubmission();
    const rejectSubmission = useRejectPaymentSubmission();

    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);

    const orders = data?.data ?? [];

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Payments</h1>
                <p className="text-xs text-ink-400">Every order across every student.</p>
            </div>

            <PaymentQuickStats />

            {/* Segmented tab bar */}
            <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5 self-start">
                {TABS.map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && orders.length === 0 && (
                <EmptyState icon={CreditCard} title="No payments" description="Nothing in this tab yet." className="mt-6" />
            )}

            {!isLoading && orders.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers — vary by tab */}
                    {tab === 'pending' && (
                        <div className="grid grid-cols-[minmax(180px,1fr)_120px_140px_60px_110px_80px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Amount owed</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Amount submitted</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Receipt</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                            <span />
                        </div>
                    )}
                    {tab === 'partial' && (
                        <div className="grid grid-cols-[minmax(180px,1fr)_120px_120px_130px_80px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Amount owed</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Amount paid</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Remaining</span>
                            <span />
                        </div>
                    )}
                    {tab === 'paid' && (
                        <div className="grid grid-cols-[minmax(180px,1fr)_120px_minmax(120px,1fr)_80px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Amount</span>
                            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Payments</span>
                            <span />
                        </div>
                    )}

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {orders.map((order) => {
                            const orderStatus = orderStatusDisplay(order.status);
                            const submission = order.pending_submission;
                            const submissionStatus = submission ? paymentSubmissionStatusDisplay(submission.status) : null;

                            return (
                                <li
                                    key={order.id}
                                    className={cn(
                                        'items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50',
                                        tab === 'pending' && 'grid grid-cols-[minmax(180px,1fr)_120px_140px_60px_110px_80px]',
                                        tab === 'partial' && 'grid grid-cols-[minmax(180px,1fr)_120px_120px_130px_80px]',
                                        tab === 'paid' && 'grid grid-cols-[minmax(180px,1fr)_120px_minmax(120px,1fr)_80px]',
                                    )}
                                >
                                    {/* Student */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        {order.student ? (
                                            <>
                                                <Avatar
                                                    name={order.student.name}
                                                    size="sm"
                                                    className="size-7 shrink-0 text-xs"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-ink-900">{order.student.name}</p>
                                                    <p className="truncate text-xs text-ink-400">{order.student.email}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-ink-400">—</span>
                                        )}
                                    </div>

                                    {tab === 'pending' && (
                                        <>
                                            <p className="text-right font-mono text-sm">{formatAmount(order.amount, order.currency)}</p>
                                            <p className="text-right font-mono text-sm">
                                                {submission ? formatAmount(submission.amount, order.currency) : '—'}
                                            </p>
                                            <ReceiptCell order={order} />
                                            <div>
                                                {submissionStatus ? (
                                                    <Badge
                                                        label={submissionStatus.label}
                                                        tone={submissionStatus.tone}
                                                        icon={submissionStatus.icon}
                                                    />
                                                ) : (
                                                    <Badge label="Awaiting payment" tone="neutral" icon={orderStatus.icon} />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {tab === 'partial' && (
                                        <>
                                            <p className="text-right font-mono text-sm">{formatAmount(order.amount, order.currency)}</p>
                                            <p className="text-right font-mono text-sm">{formatAmount(order.amount_paid, order.currency)}</p>
                                            <p className="text-right font-mono text-sm">{formatAmount(order.remaining_balance, order.currency)}</p>
                                        </>
                                    )}

                                    {tab === 'paid' && (
                                        <>
                                            <p className="text-right font-mono text-sm">{formatAmount(order.amount, order.currency)}</p>
                                            <span className="flex items-center gap-1.5 text-sm text-success-600">
                                                <CheckCircle2 className="size-4" aria-hidden="true" />
                                                Payments completed
                                            </span>
                                        </>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1">
                                        {submission && (
                                            <>
                                                <button
                                                    onClick={() => confirmSubmission.mutate(submission.id)}
                                                    aria-label={`Confirm payment for order #${order.id}`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                                >
                                                    <Check className="size-4 text-success-600" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => rejectSubmission.mutate(submission.id)}
                                                    aria-label={`Reject payment for order #${order.id}`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                                                >
                                                    <X className="size-4" aria-hidden="true" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setViewingOrder(order)}
                                            aria-label={`View order #${order.id}`}
                                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                        >
                                            <Eye className="size-4" aria-hidden="true" />
                                        </button>
                                        {tab !== 'paid' && !submission && (
                                            <button
                                                onClick={() => setReviewingOrder(order)}
                                                aria-label={`Review payment for order #${order.id}`}
                                                className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                            >
                                                <ReceiptText className="size-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {viewingOrder && <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
            {reviewingOrder && <ReviewPaymentModal order={reviewingOrder} onClose={() => setReviewingOrder(null)} />}
        </div>
    );
}
