import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Award, BookOpen, Compass, CreditCard, LogOut } from 'lucide-react';
import { useMyEnrolments, useSubmitPayment, useWithdrawEnrolment } from '@/features/enrolment/useEnrolments';
import { useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useCourseSequence } from '@/features/learning/useCourseSequence';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
    courseApplicationStatusDisplay,
    courseProgressStatusDisplay,
    enrolmentStatusDisplay,
    orderStatusDisplay,
    paymentSubmissionStatusDisplay,
} from '@/lib/statusBadge';
import { findNextIncompleteItem, itemLinkFor } from '@/lib/courseSequence';
import { ApiError } from '@/lib/api/client';
import type { Enrolment, Order, ProgressDashboardRow } from '@/lib/api/types';

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

/**
 * Its own component (not inlined in the `.map()` below) because the Continue link needs
 * `useCourseSequence`, and hooks can only be called from a component, not a callback.
 */
function EnrolmentCard({
    enrolment,
    progress,
    confirmingWithdrawId,
    withdrawIsPending,
    onWithdraw,
    onPay,
}: {
    enrolment: Enrolment;
    progress: ProgressDashboardRow | undefined;
    confirmingWithdrawId: number | null;
    withdrawIsPending: boolean;
    onWithdraw: (enrolmentId: number) => void;
    onPay: (order: Order) => void;
}) {
    const status = enrolmentStatusDisplay(enrolment.status);
    const order = enrolment.order;
    const orderStatus = order ? orderStatusDisplay(order.status) : null;
    const pendingSubmission = order?.pending_submission ?? null;
    const pendingSubmissionStatus = pendingSubmission ? paymentSubmissionStatusDisplay(pendingSubmission.status) : null;
    const progressStatus = progress ? courseProgressStatusDisplay(progress.status) : null;

    const { flatItems } = useCourseSequence(enrolment.course.id);
    const nextIncompleteItem = findNextIncompleteItem(flatItems);
    const continueHref = nextIncompleteItem
        ? itemLinkFor(nextIncompleteItem, enrolment.course.id)
        : `/learn/courses/${enrolment.course.id}`;

    return (
        <Card>
            <Link to={`/learn/courses/${enrolment.course.id}`} className="flex gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-blue-50 text-blue-600">
                    {enrolment.course.thumbnail_url ? (
                        <img src={enrolment.course.thumbnail_url} alt="" className="size-full object-cover" />
                    ) : (
                        <BookOpen className="size-6" aria-hidden="true" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                        {orderStatus && <Badge label={orderStatus.label} tone={orderStatus.tone} icon={orderStatus.icon} />}
                    </div>
                    <h3 className="mt-1 truncate text-lg">{enrolment.course.title}</h3>
                    <p className="mt-1 text-sm text-ink-600">
                        Enrolled {new Date(enrolment.applied_at).toLocaleDateString()}
                    </p>
                </div>
            </Link>

            {progress && (
                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <Badge label={progressStatus!.label} tone={progressStatus!.tone} icon={progressStatus!.icon} />
                        <span className="font-mono text-xs text-ink-600">{progress.percent_complete}%</span>
                    </div>
                    <ProgressBar percent={progress.percent_complete} />

                    <Link to={continueHref}>
                        <Button variant="secondary" className="w-full justify-center px-2 py-1 text-sm">
                            Continue
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>

                    {progress.certificate && (
                        <a
                            href={progress.certificate.certificate_url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                            <Award className="size-4" aria-hidden="true" />
                            {progress.certificate.certificate_url ? 'Download certificate' : 'Certificate generating…'}
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
                                onClick={() => onPay(order)}
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
                    onClick={() => onWithdraw(enrolment.id)}
                    isLoading={withdrawIsPending}
                    className="mt-3 w-full justify-start px-2 py-1 text-sm"
                >
                    <LogOut className="size-4" aria-hidden="true" />
                    {confirmingWithdrawId === enrolment.id ? 'Confirm withdrawal?' : 'Withdraw'}
                </Button>
            )}
        </Card>
    );
}

export function MyCoursesPage() {
    const { data, isLoading } = useMyEnrolments();
    const { data: applications } = useMyCourseApplications();
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
    const openApplications = (applications ?? []).filter((application) => application.status !== 'approved');

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

            {openApplications.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg text-ink-900">Applications awaiting review</h2>
                    <p className="text-sm text-ink-600">
                        You&apos;ll be notified once an admin makes a decision — no need to check back.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {openApplications.map((application) => {
                            const status = courseApplicationStatusDisplay(application.status);

                            return (
                                <Card key={application.id} className="border-dashed bg-surface-50">
                                    <div className="flex items-center justify-between">
                                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                    </div>
                                    <h3 className="mt-3 text-lg">{application.course.title}</h3>
                                    <p className="mt-1 text-sm text-ink-600">
                                        Applied {new Date(application.applied_at).toLocaleDateString()}
                                    </p>

                                    {application.status === 'rejected' && application.recommended_courses.length > 0 && (
                                        <div className="mt-3 flex flex-col gap-1 border-t border-surface-100 pt-3 text-sm">
                                            <p className="text-ink-600">Consider starting with:</p>
                                            {application.recommended_courses.map((recommended) => (
                                                <Link
                                                    key={recommended.id}
                                                    to={`/courses/${recommended.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {recommended.title}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    {enrolments.map((enrolment) => (
                        <EnrolmentCard
                            key={enrolment.id}
                            enrolment={enrolment}
                            progress={progressByCourseId.get(enrolment.course.id)}
                            confirmingWithdrawId={confirmingWithdrawId}
                            withdrawIsPending={withdrawEnrolment.isPending}
                            onWithdraw={handleWithdraw}
                            onPay={setPayingOrder}
                        />
                    ))}
                </div>
            )}

            {payingOrder && <MakePaymentModal order={payingOrder} onClose={() => setPayingOrder(null)} />}
        </div>
    );
}
