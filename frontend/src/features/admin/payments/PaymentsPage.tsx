import { useState } from 'react';
import { Check, CheckCircle2, CreditCard, Eye, Image as ImageIcon, ReceiptText, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
    useConfirmPaymentSubmission,
    useOrders,
    useRejectPaymentSubmission,
    useUpdateOrder,
} from '@/features/admin/payments/useAdminPayments';
import { orderStatusDisplay, paymentSubmissionStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { Order, OrderStatus } from '@/lib/api/types';

type Tab = OrderStatus;

const TABS: [Tab, string][] = [
    ['pending', 'Receivables'],
    ['partial', 'Partials'],
    ['paid', 'Paid'],
];

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
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
        <div>
            <div className="flex gap-1 border-b border-surface-100">
                {TABS.map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'border-b-2 px-3 py-2 text-sm font-medium',
                            tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-600',
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
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                {tab === 'pending' && (
                                    <>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Amount owed</th>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Amount submitted</th>
                                        <th className="px-4 py-2 font-medium text-ink-600">Receipt</th>
                                        <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                    </>
                                )}
                                {tab === 'partial' && (
                                    <>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Amount owed</th>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Amount paid</th>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Remaining balance</th>
                                    </>
                                )}
                                {tab === 'paid' && (
                                    <>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Amount</th>
                                        <th className="px-4 py-2 font-medium text-ink-600">Payments</th>
                                    </>
                                )}
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => {
                                const orderStatus = orderStatusDisplay(order.status);
                                const submission = order.pending_submission;
                                const submissionStatus = submission ? paymentSubmissionStatusDisplay(submission.status) : null;

                                return (
                                    <tr key={order.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-ink-900">{order.student?.name ?? '—'}</p>
                                            <p className="text-xs text-ink-600">{order.student?.email}</p>
                                        </td>

                                        {tab === 'pending' && (
                                            <>
                                                <td className="px-4 py-3 text-right font-mono">{formatAmount(order.amount, order.currency)}</td>
                                                <td className="px-4 py-3 text-right font-mono">
                                                    {submission ? formatAmount(submission.amount, order.currency) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ReceiptCell order={order} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {submissionStatus ? (
                                                        <Badge
                                                            label={submissionStatus.label}
                                                            tone={submissionStatus.tone}
                                                            icon={submissionStatus.icon}
                                                        />
                                                    ) : (
                                                        <Badge label="Awaiting payment" tone="neutral" icon={orderStatus.icon} />
                                                    )}
                                                </td>
                                            </>
                                        )}

                                        {tab === 'partial' && (
                                            <>
                                                <td className="px-4 py-3 text-right font-mono">{formatAmount(order.amount, order.currency)}</td>
                                                <td className="px-4 py-3 text-right font-mono">
                                                    {formatAmount(order.amount_paid, order.currency)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">
                                                    {formatAmount(order.remaining_balance, order.currency)}
                                                </td>
                                            </>
                                        )}

                                        {tab === 'paid' && (
                                            <>
                                                <td className="px-4 py-3 text-right font-mono">{formatAmount(order.amount, order.currency)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1.5 text-success-600">
                                                        <CheckCircle2 className="size-4" aria-hidden="true" />
                                                        Payments completed
                                                    </span>
                                                </td>
                                            </>
                                        )}

                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {submission && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => confirmSubmission.mutate(submission.id)}
                                                            aria-label={`Confirm payment for order #${order.id}`}
                                                        >
                                                            <Check className="size-4 text-success-600" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => rejectSubmission.mutate(submission.id)}
                                                            aria-label={`Reject payment for order #${order.id}`}
                                                        >
                                                            <X className="size-4 text-danger-600" aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setViewingOrder(order)}
                                                    aria-label={`View order #${order.id}`}
                                                >
                                                    <Eye className="size-4" aria-hidden="true" />
                                                </Button>
                                                {tab !== 'paid' && !submission && (
                                                    <Button
                                                        variant="ghost"
                                                        className="px-2 py-1"
                                                        onClick={() => setReviewingOrder(order)}
                                                        aria-label={`Review payment for order #${order.id}`}
                                                    >
                                                        <ReceiptText className="size-4" aria-hidden="true" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {viewingOrder && <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
            {reviewingOrder && <ReviewPaymentModal order={reviewingOrder} onClose={() => setReviewingOrder(null)} />}
        </div>
    );
}
