import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    AlertCircle,
    ArrowRight,
    Award,
    BookOpen,
    CheckCircle2,
    Compass,
    CreditCard,
    LogOut,
    Star,
    TrendingUp,
    X,
    XCircle,
} from 'lucide-react';
import { useMyEnrolments, useSubmitPayment, useWithdrawEnrolment } from '@/features/enrolment/useEnrolments';
import { useDismissCourseApplication, useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useCourseSequence } from '@/features/learning/useCourseSequence';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { ApplicationStatusCard } from '@/features/enrolment/ApplicationStatusCard';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { useMyReviews } from '@/features/reviews/useReviews';
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
    orderStatusDisplay,
    paymentSubmissionStatusDisplay,
} from '@/lib/statusBadge';
import { findNextIncompleteItem, itemLinkFor } from '@/lib/courseSequence';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { CourseReview, Enrolment, ProgressDashboardRow } from '@/lib/api/types';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const PROFILE_MODAL_DISMISSED_KEY = 'profile_completion_modal_dismissed';

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

function formatFieldName(fieldName: string): string {
    return fieldName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// ─── Profile completion modal ─────────────────────────────────────────────────

function ProfileCompletionModal({
    profileStatus,
    onClose,
}: {
    profileStatus: ProfileStatus;
    onClose: () => void;
}) {
    const allFields = [
        ...profileStatus.completed.map((f) => ({ name: f, done: true })),
        ...profileStatus.missing.map((f) => ({ name: f, done: false })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Complete your profile"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-0 shadow-xl">
                {/* Header gradient strip */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
                                <AlertCircle className="size-5 text-white" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold text-white">Complete your profile</h2>
                                <p className="text-xs text-blue-100">
                                    Required to apply for courses
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-blue-100">
                            <span>Profile completion</span>
                            <span className="font-mono font-medium text-white">{profileStatus.percentage}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full rounded-full bg-white transition-all duration-500"
                                style={{ width: `${profileStatus.percentage}%` }}
                                role="presentation"
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Required fields</p>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {allFields.map(({ name, done }) => (
                            <div key={name} className="flex items-center gap-2 text-sm">
                                {done ? (
                                    <CheckCircle2 className="size-3.5 shrink-0 text-success-600" aria-hidden="true" />
                                ) : (
                                    <XCircle className="size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                                )}
                                <span className={cn('truncate', done ? 'text-ink-900' : 'text-ink-500')}>
                                    {formatFieldName(name)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-surface-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="text-sm text-ink-400 hover:text-ink-600"
                    >
                        Remind me later
                    </button>
                    <Link to="/profile/complete" onClick={onClose}>
                        <Button size="sm">
                            Complete profile
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Make payment modal ───────────────────────────────────────────────────────

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
        if (!file) return;
        if (file.size > MAX_RECEIPT_BYTES) { setError('That file is over 5MB. Choose a smaller one.'); return; }
        setError(null);
        setReceipt(file);
    };

    const handleSubmit = async () => {
        if (!selected?.order) return;
        setError(null);
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) { setError('Enter an amount greater than zero.'); return; }
        if (numericAmount > selected.order.remaining_balance) { setError("You can't pay more than the remaining balance for this course."); return; }
        if (!receipt) { setError('Attach a receipt image.'); return; }
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
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={submitPayment.isPending}>Submit</Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {enrolments.length > 1 && (
                    <button type="button" onClick={() => setSelected(null)} className="self-start text-sm text-blue-600 hover:underline">
                        ← Choose a different course
                    </button>
                )}
                {error && <Alert variant="error" message={error} />}
                <p className="text-sm text-ink-600">
                    Remaining balance: <span className="font-medium text-ink-900">{formatAmount(order.remaining_balance, order.currency)}</span>
                </p>
                <Input label={`Amount to pay (${order.currency})`} type="number" min={0} max={order.remaining_balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Receipt image</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-sm text-ink-600" />
                    {receipt && <span className="text-xs text-ink-600">{receipt.name}</span>}
                </label>
            </div>
        </Modal>
    );
}

// ─── Withdraw confirm modal ───────────────────────────────────────────────────

function WithdrawConfirmModal({ enrolment, onClose }: { enrolment: Enrolment; onClose: () => void }) {
    const withdrawEnrolment = useWithdrawEnrolment();
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Withdraw from ${enrolment.course.title}?`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={async () => { await withdrawEnrolment.mutateAsync(enrolment.id); onClose(); }} isLoading={withdrawEnrolment.isPending}>
                        Withdraw
                    </Button>
                </>
            }
        >
            <p className="text-sm text-ink-600">
                You&apos;ll lose access to this course and this can&apos;t be undone from your dashboard — contact support if you change your mind.
            </p>
        </Modal>
    );
}

// ─── Enrolment card ───────────────────────────────────────────────────────────

function EnrolmentCard({ enrolment, progress, review, onWithdraw, onReview }: {
    enrolment: Enrolment;
    progress: ProgressDashboardRow | undefined;
    review: CourseReview | undefined;
    onWithdraw: () => void;
    onReview: () => void;
}) {
    const status = enrolmentStatusDisplay(enrolment.status);
    const order = enrolment.order;
    const pendingSubmission = order?.pending_submission ?? null;
    const pendingSubmissionStatus = pendingSubmission ? paymentSubmissionStatusDisplay(pendingSubmission.status) : null;
    const orderStatus = order ? orderStatusDisplay(order.status) : null;
    const progressStatus = progress ? courseProgressStatusDisplay(progress.status) : null;

    const { flatItems } = useCourseSequence(enrolment.course.id);
    const nextIncompleteItem = findNextIncompleteItem(flatItems);
    // If there's a next incomplete item, go directly to it; otherwise land on the course
    // player page which will show the module list (and auto-expand the first unlocked module).
    const continueHref = nextIncompleteItem
        ? itemLinkFor(nextIncompleteItem, enrolment.course.id)
        : `/learn/courses/${enrolment.course.id}`;

    return (
        <Card className="flex flex-col gap-0 p-0 overflow-hidden">
            {/* Thumbnail */}
            <Link to={`/learn/courses/${enrolment.course.id}`} className="block">
                <div className="h-32 w-full overflow-hidden bg-surface-100">
                    {enrolment.course.thumbnail_url ? (
                        <img src={enrolment.course.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <BookOpen className="size-8 text-ink-300" aria-hidden="true" />
                        </div>
                    )}
                </div>
            </Link>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                        {pendingSubmissionStatus && (
                            <Badge label={pendingSubmissionStatus.label} tone={pendingSubmissionStatus.tone} icon={pendingSubmissionStatus.icon} />
                        )}
                    </div>
                    <Link to={`/learn/courses/${enrolment.course.id}`}>
                        <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink-900 hover:text-blue-600">
                            {enrolment.course.title}
                        </h3>
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-400">
                        Enrolled {new Date(enrolment.applied_at).toLocaleDateString()}
                    </p>
                </div>

                {progress && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Badge label={progressStatus!.label} tone={progressStatus!.tone} icon={progressStatus!.icon} />
                            <span className="font-mono text-xs font-medium text-ink-900">{progress.percent_complete}%</span>
                        </div>
                        <ProgressBar percent={progress.percent_complete} />
                        <Link to={continueHref}>
                            <Button variant="primary" size="sm" className="w-full justify-center">
                                {progress.percent_complete === 0 ? 'Start learning' : 'Continue learning'}
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                            </Button>
                        </Link>
                        {progress.certificate && (
                            <a href={progress.certificate.certificate_url ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                <Award className="size-3.5" aria-hidden="true" />
                                {progress.certificate.certificate_url ? 'Download certificate' : 'Certificate generating…'}
                            </a>
                        )}
                        {progress.certificate && (!review || review.status === 'rejected') && (
                            <button type="button" onClick={onReview} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <Star className="size-3.5" aria-hidden="true" />
                                {review ? 'Edit your review' : 'Rate this course'}
                            </button>
                        )}
                    </div>
                )}

                {order && order.remaining_balance > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-surface-100 pt-2">
                        {pendingSubmission && pendingSubmissionStatus ? (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-ink-600">{formatAmount(pendingSubmission.amount, order.currency)} submitted</span>
                                <Badge label={pendingSubmissionStatus.label} tone={pendingSubmissionStatus.tone} icon={pendingSubmissionStatus.icon} />
                            </div>
                        ) : (
                            <p className="text-xs text-ink-600">
                                Amount owed: <span className="font-medium text-ink-900">{formatAmount(order.remaining_balance, order.currency)}</span>
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-auto border-t border-surface-100 pt-2">
                    <button type="button" onClick={onWithdraw} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-danger-600">
                        <LogOut className="size-3.5" aria-hidden="true" />
                        Withdraw
                    </button>
                </div>
            </div>
        </Card>
    );
}

// ─── Overview strip ───────────────────────────────────────────────────────────

function OverviewStrip({ activeEnrolments, progressRows }: { activeEnrolments: Enrolment[]; progressRows: ProgressDashboardRow[] }) {
    if (activeEnrolments.length === 0) return null;

    const inProgress = progressRows.filter((r) => r.status === 'in_progress').length;
    const completed = progressRows.filter((r) => r.status === 'completed').length;
    const avgCompletion = progressRows.length > 0
        ? Math.round(progressRows.reduce((sum, r) => sum + r.percent_complete, 0) / progressRows.length)
        : 0;

    return (
        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            <div className="flex flex-wrap divide-x divide-surface-100">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Enrolled</p>
                    <p className="text-2xl font-bold text-ink-900">{activeEnrolments.length}</p>
                    <p className="text-xs text-ink-400">{inProgress} in progress · {completed} completed</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Avg. completion</p>
                    <div className="flex items-end gap-1.5">
                        <p className="text-2xl font-bold text-blue-600">{avgCompletion}%</p>
                        <TrendingUp className="mb-1 size-3.5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                        <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${avgCompletion}%` }} role="presentation" />
                    </div>
                </div>
                {/* Deadlines — placeholder until GET /me/upcoming-deadlines is available */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Upcoming deadlines</p>
                    <p className="mt-1 text-xs italic text-ink-300">No data yet</p>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        const fetchProfileStatus = async () => {
            try {
                const status = await profileApi.getStatus();
                setProfileStatus(status);
                // Show modal once per session if incomplete and not dismissed
                if (
                    status.percentage < 100 &&
                    !sessionStorage.getItem(PROFILE_MODAL_DISMISSED_KEY)
                ) {
                    setShowProfileModal(true);
                }
            } catch {
                setProfileStatus(null);
            }
        };
        fetchProfileStatus();
    }, []);

    const handleCloseProfileModal = () => {
        setShowProfileModal(false);
        sessionStorage.setItem(PROFILE_MODAL_DISMISSED_KEY, '1');
    };

    if (isLoading) return <Spinner />;

    const activeEnrolments = (data?.data ?? []).filter((e) => e.status !== 'withdrawn');
    const payableEnrolments = activeEnrolments.filter(
        (e) => e.order && e.order.remaining_balance > 0 && !e.order.pending_submission,
    );
    const progressByCourseId = new Map((progressRows ?? []).map((r) => [r.course.id, r]));
    const reviewByCourseId = new Map((myReviews ?? []).flatMap((r) => (r.course ? [[r.course.id, r] as const] : [])));
    const sortedApplications = (applications ?? [])
        .slice()
        .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
    const allApplicationsPending = sortedApplications.every((a) => a.status === 'pending');

    return (
        <div className="space-y-5">

            {/* Profile completion modal — shown once per session when profile is incomplete */}
            {showProfileModal && profileStatus && (
                <ProfileCompletionModal profileStatus={profileStatus} onClose={handleCloseProfileModal} />
            )}

            {/* Page header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-ink-900">My courses</h1>
                    <p className="text-xs text-ink-400">
                        {activeEnrolments.length} active enrolment{activeEnrolments.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {payableEnrolments.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={() => setIsMakingPayment(true)}>
                            <CreditCard className="size-3.5" aria-hidden="true" />
                            Make a payment
                        </Button>
                    )}
                    <Link to="/courses">
                        <Button size="sm" variant="secondary">
                            <Compass className="size-3.5" aria-hidden="true" />
                            Browse courses
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Overview strip */}
            <OverviewStrip activeEnrolments={activeEnrolments} progressRows={progressRows ?? []} />

            {/* Applications */}
            {sortedApplications.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-ink-900">
                        {allApplicationsPending ? 'Applications' : 'Application updates'}
                    </h2>
                    <p className="text-xs text-ink-400">
                        {allApplicationsPending
                            ? "Your application is in review — you'll be notified once an admin approves or declines."
                            : 'Track the status of your course applications.'}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Course grid */}
            {activeEnrolments.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="Browse the catalogue to find your first course."
                    action={
                        <Link to="/courses">
                            <Button size="sm">Browse the catalogue</Button>
                        </Link>
                    }
                />
            ) : (
                <div>
                    <h2 className="mb-3 text-sm font-semibold text-ink-900">Active learning</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

                        {/* "Add a course" card — always visible at the end of the grid */}
                        <Link
                            to="/courses"
                            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-200 bg-surface-0 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50"
                        >
                            <span className="flex size-10 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
                                <Compass className="size-5 text-blue-500" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-ink-900">Add a course</p>
                                <p className="mt-0.5 text-xs text-ink-400">Browse the catalogue and enrol</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Modals */}
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
