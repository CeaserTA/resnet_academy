import { useState } from 'react';
import { Link } from 'react-router';
import { Award, BookOpen, Compass, CreditCard, LogOut } from 'lucide-react';
import { useMyEnrolments, useSubmitPayment, useWithdrawEnrolment } from '@/features/enrolment/useEnrolments';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { courseProgressStatusDisplay, enrolmentStatusDisplay, orderStatusDisplay, paymentSubmissionStatusDisplay } from '@/lib/statusBadge';
import { ApiError } from '@/lib/api/client';
import type { Order } from '@/lib/api/types';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

function MakePaymentModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const submitPayment = useSubmitPayment();
    const [amount, setAmount] = useState(order.remaining_balance.toString());
    const [receipt, setReceipt] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) {
            return;
        }

        if (selected.size > MAX_RECEIPT_BYTES) {
            setError('That file is over 5MB. Choose a smaller one.');
            return;
        }

        setError(null);
        setReceipt(selected);
    };

    const handleSubmit = async () => {
        setError(null);

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            setError('Enter an amount greater than zero.');
            return;
        }
        if (numericAmount > order.remaining_balance) {
            setError("You can't pay more than the remaining balance for this course.");
            return;
        }
        if (!receipt) {
            setError('Attach a receipt image.');
            return;
        }

        try {
            await submitPayment.mutateAsync({ orderId: order.id, amount: numericAmount, receipt });
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit the payment. Try again.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Make a payment"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={submitPayment.isPending}>
                        Submit
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                <p className="text-sm text-ink-600">
                    Remaining balance:{' '}
                    <span className="font-medium text-ink-900">{formatAmount(order.remaining_balance, order.currency)}</span>
                </p>

                <Input
                    label={`Amount to pay (${order.currency})`}
                    type="number"
                    min={0}
                    max={order.remaining_balance}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Receipt image</span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="text-sm text-ink-600"
                    />
                    {receipt && <span className="text-xs text-ink-600">{receipt.name}</span>}
                </label>
            </div>
        </Modal>
    );
}

export function MyCoursesPage() {
    const { data, isLoading } = useMyEnrolments();
    const { data: progressRows } = useProgressDashboard();
    const withdrawEnrolment = useWithdrawEnrolment();
    const [confirmingWithdrawId, setConfirmingWithdrawId] = useState<number | null>(null);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);

    const handleWithdraw = (enrolmentId: number) => {
        if (confirmingWithdrawId !== enrolmentId) {
            setConfirmingWithdrawId(enrolmentId);
            return;
        }

        withdrawEnrolment.mutate(enrolmentId);
        setConfirmingWithdrawId(null);
    };

    if (isLoading) {
        return <Spinner />;
    }

    const enrolments = data?.data ?? [];
    const progressByCourseId = new Map((progressRows ?? []).map((row) => [row.course.id, row]));

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">My courses</h1>
                <Link to="/courses">
                    <Button variant="secondary">
                        <Compass className="size-4" aria-hidden="true" />
                        Browse catalogue
                    </Button>
                </Link>
            </div>

            {enrolments.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="You haven’t enrolled in any courses yet"
                    description="Browse the catalogue to find your first course."
                    action={
                        <Link to="/courses">
                            <Button>Browse the catalogue</Button>
                        </Link>
                    }
                    className="mt-6"
                />
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {enrolments.map((enrolment) => {
                        const status = enrolmentStatusDisplay(enrolment.status);
                        const order = enrolment.order;
                        const orderStatus = order ? orderStatusDisplay(order.status) : null;
                        const pendingSubmission = order?.pending_submission ?? null;
                        const pendingSubmissionStatus = pendingSubmission
                            ? paymentSubmissionStatusDisplay(pendingSubmission.status)
                            : null;
                        const progress = progressByCourseId.get(enrolment.course.id);
                        const progressStatus = progress ? courseProgressStatusDisplay(progress.status) : null;

                        return (
                            <Card key={enrolment.id}>
                                <Link to={`/learn/courses/${enrolment.course.id}`}>
                                    <div className="flex items-center justify-between">
                                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                        {orderStatus && (
                                            <Badge
                                                label={orderStatus.label}
                                                tone={orderStatus.tone}
                                                icon={orderStatus.icon}
                                            />
                                        )}
                                    </div>
                                    <h3 className="mt-3 text-lg">{enrolment.course.title}</h3>
                                    <p className="mt-1 text-sm text-ink-600">
                                        Enrolled {new Date(enrolment.applied_at).toLocaleDateString()}
                                    </p>
                                </Link>

                                {progress && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                label={progressStatus!.label}
                                                tone={progressStatus!.tone}
                                                icon={progressStatus!.icon}
                                            />
                                            <span className="font-mono text-xs text-ink-600">
                                                {progress.percent_complete}%
                                            </span>
                                        </div>
                                        <ProgressBar percent={progress.percent_complete} />

                                        {progress.certificate && (
                                            <a
                                                href={progress.certificate.certificate_url ?? undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                            >
                                                <Award className="size-4" aria-hidden="true" />
                                                {progress.certificate.certificate_url
                                                    ? 'Download certificate'
                                                    : 'Certificate generating…'}
                                            </a>
                                        )}
                                    </div>
                                )}

                                {order && order.remaining_balance > 0 && (
                                    <div className="mt-4 flex flex-col gap-2 border-t border-surface-100 pt-3">
                                        {pendingSubmission && pendingSubmissionStatus ? (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-ink-600">
                                                    {formatAmount(pendingSubmission.amount, order.currency)} submitted
                                                </span>
                                                <Badge
                                                    label={pendingSubmissionStatus.label}
                                                    tone={pendingSubmissionStatus.tone}
                                                    icon={pendingSubmissionStatus.icon}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-ink-600">
                                                    Amount owed:{' '}
                                                    <span className="font-medium text-ink-900">
                                                        {formatAmount(order.remaining_balance, order.currency)}
                                                    </span>
                                                </p>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setPayingOrder(order)}
                                                    className="w-full justify-center px-2 py-1 text-sm"
                                                >
                                                    <CreditCard className="size-4" aria-hidden="true" />
                                                    Make a payment
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {enrolment.status === 'confirmed' && (
                                    <Button
                                        variant={confirmingWithdrawId === enrolment.id ? 'destructive' : 'ghost'}
                                        onClick={() => handleWithdraw(enrolment.id)}
                                        isLoading={withdrawEnrolment.isPending}
                                        className="mt-3 w-full justify-start px-2 py-1 text-sm"
                                    >
                                        <LogOut className="size-4" aria-hidden="true" />
                                        {confirmingWithdrawId === enrolment.id ? 'Confirm withdrawal?' : 'Withdraw'}
                                    </Button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {payingOrder && <MakePaymentModal order={payingOrder} onClose={() => setPayingOrder(null)} />}
        </div>
    );
}
