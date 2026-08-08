import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Award, BookOpen, Compass, CreditCard, LogOut, Star } from 'lucide-react';
import { useMyEnrolments, useSubmitPayment, useWithdrawEnrolment } from '@/features/enrolment/useEnrolments';
import { useDismissCourseApplication, useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useCourseSequence } from '@/features/learning/useCourseSequence';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { ApplicationStatusCard } from '@/features/enrolment/ApplicationStatusCard';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { useMyReviews } from '@/features/reviews/useReviews';
import { ProfileCompletionCard } from '@/features/profile/ProfileCompletionCard';
import { profileApi, type ProfileStatus } from '@/lib/api/profileApi';
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
    courseProgressStatusDisplay,
    enrolmentStatusDisplay,
    paymentSubmissionStatusDisplay,
} from '@/lib/statusBadge';
import { findNextIncompleteItem, itemLinkFor } from '@/lib/courseSequence';
import { ApiError } from '@/lib/api/client';
import type { CourseReview, Enrolment, ProgressDashboardRow } from '@/lib/api/types';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

/**
 * Opened from the page level (not a specific card), so it always starts by asking which course
 * the payment is for — unless there's only one payable course, in which case that's pointless and
 * it jumps straight to the form.
 */
function MakePaymentModal({ enrolments, onClose }: { enrolments: Enrolment[]; onClose: () => void }) {
    const submitPayment = useSubmitPayment();
    const [selected, setSelected] = useState<Enrolment | null>(() => (enrolments.length === 1 ? enrolments[0] : null));
    const [amount, setAmount] = useState(() =>
        enrolments.length === 1 ? enrolments[0].order!.remaining_balance.toString() : '',
    );
    const [receipt, setReceipt] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSelect = (enrolment: Enrolment) => {
        setSelected(enrolment);
        setAmount(enrolment.order!.remaining_balance.toString());
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > MAX_RECEIPT_BYTES) {
            setError('That file is over 5MB. Choose a smaller one.');
            return;
        }

        setError(null);
        setReceipt(file);
    };

    const handleSubmit = async () => {
        if (!selected?.order) {
            return;
        }

        setError(null);

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            setError('Enter an amount greater than zero.');
            return;
        }
        if (numericAmount > selected.order.remaining_balance) {
            setError("You can't pay more than the remaining balance for this course.");
            return;
        }
        if (!receipt) {
            setError('Attach a receipt image.');
            return;
        }

        try {
            await submitPayment.mutateAsync({ orderId: selected.order.id, amount: numericAmount, receipt });
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit the payment. Try again.');
        }
    };

    if (!selected) {
        return (
            <Modal isOpen onClose={onClose} title="Make a payment">
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-ink-600">Choose which course you&apos;re paying for.</p>
                    {enrolments.map((enrolment) => (
                        <button
                            key={enrolment.id}
                            type="button"
                            onClick={() => handleSelect(enrolment)}
                            className="flex items-center justify-between rounded-md border border-surface-100 px-3 py-2.5 text-left text-sm hover:bg-surface-50"
                        >
                            <span className="font-medium text-ink-900">{enrolment.course.title}</span>
                            <span className="text-ink-600">
                                {formatAmount(enrolment.order!.remaining_balance, enrolment.order!.currency)}
                            </span>
                        </button>
                    ))}
                </div>
            </Modal>
        );
    }

    const order = selected.order!;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Pay for ${selected.course.title}`}
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
                {enrolments.length > 1 && (
                    <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="self-start text-sm text-blue-600 hover:underline"
                    >
                        ← Choose a different course
                    </button>
                )}

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

function WithdrawConfirmModal({ enrolment, onClose }: { enrolment: Enrolment; onClose: () => void }) {
    const withdrawEnrolment = useWithdrawEnrolment();

    const handleConfirm = async () => {
        await withdrawEnrolment.mutateAsync(enrolment.id);
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Withdraw from ${enrolment.course.title}?`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} isLoading={withdrawEnrolment.isPending}>
                        Withdraw
                    </Button>
                </>
            }
        >
            <p className="text-sm text-ink-600">
                You&apos;ll lose access to this course, and this can&apos;t be undone from your dashboard — contact
                support if you change your mind.
            </p>
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
    review,
    onWithdraw,
    onReview,
}: {
    enrolment: Enrolment;
    progress: ProgressDashboardRow | undefined;
    review: CourseReview | undefined;
    onWithdraw: () => void;
    onReview: () => void;
}) {
    // `enrolment.status` (confirmed/withdrawn) is the sole authoritative "is this student in the
    // course" badge. `order.status` (pending/partial/paid) is a separate, orthogonal concept —
    // payment progress, not membership — so it's surfaced only in the "Amount owed" section below,
    // never as a second competing badge up here (that's what caused a card to show e.g. both
    // "Withdrawn" and "Pending" at once).
    const status = enrolmentStatusDisplay(enrolment.status);
    const order = enrolment.order;
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
            <Link to={`/learn/courses/${enrolment.course.id}`} className="block">
                {/* Course thumbnail — wider aspect ratio */}
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-blue-50">
                    {enrolment.course.thumbnail_url ? (
                        <img
                            src={enrolment.course.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-blue-300">
                            <BookOpen className="size-8" aria-hidden="true" />
                        </div>
                    )}
                </div>

                <div className="mt-3">
                    <div className="flex items-center justify-between gap-2">
                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                        {orderStatus && (
                            <Badge label={orderStatus.label} tone={orderStatus.tone} icon={orderStatus.icon} />
                        )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-900 line-clamp-1">
                        {enrolment.course.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-600">
                        Enrolled {new Date(enrolment.applied_at).toLocaleDateString()}
                    </p>
                </div>
            </Link>

            {progress && (
                <div className="mt-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <Badge label={progressStatus!.label} tone={progressStatus!.tone} icon={progressStatus!.icon} />
                        <span className="font-mono text-xs font-medium text-ink-900">{progress.percent_complete}%</span>
                    </div>
                    <ProgressBar percent={progress.percent_complete} />

                    <Link to={continueHref} className="mt-1">
                        <Button variant="primary" className="w-full justify-center">
                            Continue learning
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>

                    {progress.certificate && (
                        <a
                            href={progress.certificate.certificate_url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                        >
                            <Award className="size-4" aria-hidden="true" />
                            {progress.certificate.certificate_url ? 'Download certificate' : 'Certificate generating…'}
                        </a>
                    )}

                    {progress.certificate && (!review || review.status === 'rejected') && (
                        <button
                            type="button"
                            onClick={onReview}
                            className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                            <Star className="size-4" aria-hidden="true" />
                            {review ? 'Edit your review' : 'Rate this course'}
                        </button>
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
                        <p className="text-sm text-ink-600">
                            Amount owed:{' '}
                            <span className="font-medium text-ink-900">
                                {formatAmount(order.remaining_balance, order.currency)}
                            </span>
                        </p>
                    )}
                </div>
            )}

            <Button variant="ghost" onClick={onWithdraw} className="mt-3 w-full justify-start px-2 py-1 text-sm">
                <LogOut className="size-4" aria-hidden="true" />
                Withdraw
            </Button>
        </Card>
    );
}

export function MyCoursesPage() {
    const { data, isLoading } = useMyEnrolments();
    const { data: applications } = useMyCourseApplications();
    const { data: progressRows } = useProgressDashboard();
    const { data: myReviews } = useMyReviews();
    const dismissApplication = useDismissCourseApplication();
    const [withdrawingEnrolment, setWithdrawingEnrolment] = useState<Enrolment | null>(null);
    const [isMakingPayment, setIsMakingPayment] = useState(false);
    const [reviewingCourse, setReviewingCourse] = useState<{ id: number; title: string } | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);

    // Fetch profile status on component mount
    useEffect(() => {
        const fetchProfileStatus = async () => {
            try {
                const status = await profileApi.getStatus();
                setProfileStatus(status);
            } catch (error) {
                // Gracefully handle API errors by hiding the card and logging the error
                console.error('Failed to fetch profile status:', error);
                setProfileStatus(null);
            }
        };

        fetchProfileStatus();
    }, []);

    if (isLoading) {
        return <Spinner />;
    }

    // Withdrawn enrolments are dropped from the dashboard entirely rather than shown with a
    // "Withdrawn" badge — useWithdrawEnrolment() invalidates this query on success, so combined
    // with this filter a withdrawn card disappears as soon as the refetch lands, no manual
    // refresh needed.
    const activeEnrolments = (data?.data ?? []).filter((enrolment) => enrolment.status !== 'withdrawn');
    const payableEnrolments = activeEnrolments.filter(
        (enrolment) => enrolment.order && enrolment.order.remaining_balance > 0 && !enrolment.order.pending_submission,
    );
    const progressByCourseId = new Map((progressRows ?? []).map((row) => [row.course.id, row]));
    const reviewByCourseId = new Map((myReviews ?? []).flatMap((review) => (review.course ? [[review.course.id, review] as const] : [])));
    // Most recent first. The backend's visibleForDashboard() already excludes approved
    // applications and expired/dismissed/acted-on rejections, so no further filtering is needed
    // here. TODO: once a student can have 3+ pending applications at once, collapse them into a
    // summary row instead of listing every card individually.
    const sortedApplications = (applications ?? [])
        .slice()
        .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
    // Reassurance copy only makes sense while every listed application is still undecided — once
    // any of them has been approved/rejected, that "no need to check back" line would sit right
    // next to a resolved item, which reads as a bug.
    const allApplicationsPending = sortedApplications.every((application) => application.status === 'pending');

    return (
        <div>
            {/* Requirement 3.1, 3.5: Render ProfileCompletionCard prominently at top when percentage < 100 */}
            {profileStatus && profileStatus.percentage < 100 && (
                <div className="mb-6">
                    <ProfileCompletionCard
                        percentage={profileStatus.percentage}
                        missingFields={profileStatus.missing}
                        completedFields={profileStatus.completed}
                    />
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl">My courses</h1>
                <div className="flex gap-2">
                    {payableEnrolments.length > 0 && (
                        <Button variant="secondary" onClick={() => setIsMakingPayment(true)}>
                            <CreditCard className="size-4" aria-hidden="true" />
                            Make a payment
                        </Button>
                    )}
                    <Link to="/#courses">
                        <Button variant="secondary">
                            <Compass className="size-4" aria-hidden="true" />
                            Browse catalogue
                        </Button>
                    </Link>
                </div>
            </div>

            {sortedApplications.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg text-ink-900">{allApplicationsPending ? 'Applications' : 'Application updates'}</h2>
                    <p className="text-sm text-ink-600">
                        {allApplicationsPending
                            ? "You'll be notified once an admin makes a decision — no need to check back."
                            : 'Track the status of your course applications.'}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedApplications.map((application) => (
                            <ApplicationStatusCard
                                key={application.id}
                                application={application}
                                onDismiss={() => dismissApplication.mutate(application.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {activeEnrolments.length > 0 && <h2 className="mt-6 text-lg text-ink-900">Active Learning</h2>}

            {activeEnrolments.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="You haven’t enrolled in any courses yet"
                    description="Browse the catalogue to find your first course."
                    action={
                        <Link to="/#courses">
                            <Button>Browse the catalogue</Button>
                        </Link>
                    }
                    className="mt-6"
                />
            ) : (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeEnrolments.map((enrolment) => (
                        <EnrolmentCard
                            key={enrolment.id}
                            enrolment={enrolment}
                            progress={progressByCourseId.get(enrolment.course.id)}
                            review={reviewByCourseId.get(enrolment.course.id)}
                            onWithdraw={() => setWithdrawingEnrolment(enrolment)}
                            onReview={() => setReviewingCourse({ id: enrolment.course.id, title: enrolment.course.title })}
                        />
                    ))}
                </div>
            )}

            {isMakingPayment && (
                <MakePaymentModal enrolments={payableEnrolments} onClose={() => setIsMakingPayment(false)} />
            )}

            {withdrawingEnrolment && (
                <WithdrawConfirmModal enrolment={withdrawingEnrolment} onClose={() => setWithdrawingEnrolment(null)} />
            )}

            {reviewingCourse && (
                <ReviewFormModal
                    course={reviewingCourse}
                    existingReview={reviewByCourseId.get(reviewingCourse.id)}
                    onClose={() => setReviewingCourse(null)}
                />
            )}
        </div>
    );
}
