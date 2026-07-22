import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useOrders } from '@/features/admin/payments/useAdminPayments';
import { orderStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { OrderStatus } from '@/lib/api/types';

function formatAmount(amount: string, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

export function PaymentsPage() {
    usePageHeader('Payments', 'Every order across every student.');
    const [status, setStatus] = useState<OrderStatus | ''>('');
    const { data, isLoading } = useOrders(status || undefined);

    const orders = data?.data ?? [];

    return (
        <div>
            <Select
                label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
                className="max-w-xs"
            >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
            </Select>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && orders.length === 0 && (
                <EmptyState icon={CreditCard} title="No payments" description="Nothing matches this filter." className="mt-6" />
            )}

            {!isLoading && orders.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Course</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">Amount</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Method</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => {
                                const orderStatus = orderStatusDisplay(order.status);

                                return (
                                    <tr key={order.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-ink-900">{order.student?.name ?? '—'}</p>
                                            <p className="text-xs text-ink-600">{order.student?.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{order.course?.title ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatAmount(order.amount, order.currency)}</td>
                                        <td className="px-4 py-3">
                                            <Badge label={orderStatus.label} tone={orderStatus.tone} icon={orderStatus.icon} />
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{order.payment_method ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                            {new Date(order.paid_at ?? order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
