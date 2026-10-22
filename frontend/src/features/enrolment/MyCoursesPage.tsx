import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    ArrowRight,
    Award,
    BookOpen,
    CalendarClock,
    CreditCard,
    LogOut,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import { useMyEnrolments, useWithdrawEnrolment, useCancelTransferRequest } from '@/features/enrolment/useEnrolments';
import { useDismissCourseApplication, useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { CertificateViewerModal } from '@/features/certificates/CertificateViewerModal';
import { ApplicationStatusCard } from '@/features/enrolment/ApplicationStatusCard';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { useMyReviews } from '@/features/reviews/useReviews';
import { ReviewStatus } from '@/features/reviews/ReviewStatus';
import { ProfileCompletionModal } from '@/features/profile/ProfileCompletionModal';
import { profileApi, type ProfileStatus } from '@/lib/api/profileApi';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { courseProgressStatusDisplay, enrolmentStatusDisplay } from '@/lib/statusBadge';
import type { CourseReview, Enrolment, ProgressDashboardRow } from '@/lib/api/types';
import { formatDate } from '@/lib/formatDate';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { MakePaymentModal } from '@/features/enrolment/MakePaymentModal';
import { payableEnrolments as payableEnrolmentsOf } from '@/lib/finance';

const PROFILE_MODAL_DISMISSED_KEY = 'profile_completion_modal_dismissed';

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

// ─── Profile completion modal ─────────────────────────────────────────────────

// ─── Withdraw confirm modal ───────────────────────────────────────────────────

function WithdrawConfirmModal({ enrolment, onClose, onWithdrawSuccess }: { enrolment: Enrolment; onClose: () => void; onWithdrawSuccess: (status: string) => void }) {
    const withdrawEnrolment = useWithdrawEnrolment();
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Withdraw from ${enrolment.course.title}?`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={async () => {
                        const result = await withdrawEnrolment.mutateAsync({ enrolmentId: enrolment.id });
                        onWithdrawSuccess(result.status);
                        onClose();
                    }} isLoading={withdrawEnrolment.isPending}>
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

function EnrolmentCard({ enrolment, progress, review, reviewsLoaded, onWithdraw, onCancelTransfer, onReview, onPay, onViewCertificate }: {
    enrolment: Enrolment;
    progress: ProgressDashboardRow | undefined;
    review: CourseReview | undefined;
    reviewsLoaded: boolean;
    onWithdraw: () => void;
    onCancelTransfer: () => void;
    onReview: () => void;
    onPay: () => void;
    onViewCertificate: () => void;
}) {
    const status = enrolmentStatusDisplay(enrolment.status);
    const order = enrolment.order;
    const pendingSubmission = order?.pending_submission ?? null;
    const progressStatus = progress ? courseProgressStatusDisplay(progress.status) : null;
    const isTransferRequested = enrolment.status === 'transfer_requested';
    // A finished course is revisited, not continued — and there is nothing left to withdraw from.
    const isCompleted = progress?.status === 'completed';

    // Always link to the CoursePlayerPage — it handles "Continue where you left off" itself.
    // Previously this called useCourseSequence() inside .map(), violating rules of hooks and
    // causing one GET /courses/:id/modules request per enrolled course on every render.
    const continueHref = `/learn/courses/${enrolment.course.id}`;

    return (
        <Card className="flex flex-col gap-0 p-0 overflow-hidden">
            {/* Thumbnail */}
            <Link to={`/learn/courses/${enrolment.course.id}`} className="block" aria-label={`View ${enrolment.course.title}`}>
                <div className="h-32 w-full overflow-hidden bg-surface-100">
                    {enrolment.course.thumbnail_url ? (
                        <img src={enrolment.course.thumbnail_url} alt={enrolment.course.title} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
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
                    {/* "Confirmed" is the normal state and the progress badge below already says where the
                        student is — show the enrolment badge only for states that need attention. */}
                    {enrolment.status !== 'confirmed' && (
                        <div className="mb-2 flex items-center gap-2">
                            <Badge label={status.label} tone={status.tone} icon={status.icon} />
                        </div>
                    )}
                    <Link to={`/learn/courses/${enrolment.course.id}`}>
                        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink-900 hover:text-blue-600">
                            {enrolment.course.title}
                        </h3>
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-600">
                        Enrolled {formatDate(enrolment.applied_at)}
                    </p>
                </div>

                {progress && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Badge label={progressStatus!.label} tone={progressStatus!.tone} icon={progressStatus!.icon} />
                            <span className="text-xs font-semibold text-ink-900">{Math.round(progress.percent_complete)}%</span>
                        </div>
                        <ProgressBar percent={progress.percent_complete} />
                        {/* An upcoming intake gets the date instead of a button that would only
                            lead to locked modules — the seat is reserved, the content is not open
                            yet, and saying so is clearer than a dead end. */}
                        {progress.status === 'upcoming' && progress.starts_on ? (
                            <div className="flex items-start gap-2 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-sm text-ink-600">
                                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-600" aria-hidden="true" />
                                <span>
                                    Starts{' '}
                                    <span className="font-medium text-ink-900">
                                        {formatDate(progress.starts_on)}
                                    </span>
                                    . Your place is reserved — course content opens on that date.
                                </span>
                            </div>
                        ) : (
                            <Link to={continueHref}>
                                <Button variant="primary" size="sm" className="w-full justify-center">
                                    {isCompleted ? 'Review course' : progress.percent_complete === 0 ? 'Start learning' : 'Continue learning'}
                                    <ArrowRight className="size-3.5" aria-hidden="true" />
                                </Button>
                            </Link>
                        )}
                        {progress.certificate && (
                            // Opens the in-app viewer, which has the Download button.
                            <button
                                type="button"
                                onClick={onViewCertificate}
                                className="inline-flex items-center gap-1.5 self-start text-xs text-blue-600 hover:underline"
                            >
                                <Award className="size-3.5" aria-hidden="true" />
                                View certificate
                            </button>
                        )}
                        {progress.certificate && (
                            <ReviewStatus review={review} isLoaded={reviewsLoaded} onReview={onReview} />
                        )}
                    </div>
                )}

                {order && order.remaining_balance > 0 && !pendingSubmission && (
                    <div className="flex items-center justify-between gap-2 border-t border-surface-100 pt-2">
                        <p className="text-xs text-ink-600">
                            Amount owed: <span className="font-medium text-ink-900">{formatAmount(order.remaining_balance, order.currency)}</span>
                        </p>
                        <button type="button" onClick={onPay} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
                            Pay now
                        </button>
                    </div>
                )}

                {(isTransferRequested || !isCompleted) && (
                    <div className="mt-auto border-t border-surface-100 pt-2">
                        {isTransferRequested ? (
                            <button type="button" onClick={onCancelTransfer} className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-blue-600">
                                <XCircle className="size-3.5" aria-hidden="true" />
                                Cancel transfer request
                            </button>
                        ) : (
                            <button type="button" onClick={onWithdraw} className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-danger-600">
                                <LogOut className="size-3.5" aria-hidden="true" />
                                Withdraw
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}

// ─── Overview strip ───────────────────────────────────────────────────────────

function OverviewStrip({ activeEnrolments, progressRows }: { activeEnrolments: Enrolment[]; progressRows: ProgressDashboardRow[] }) {
    if (activeEnrolments.length === 0) return null;

    const inProgress = progressRows.filter((r) => r.status === 'in_progress').length;
    const completed = progressRows.filter((r) => r.status === 'completed').length;
    const certificates = progressRows.filter((r) => r.certificate).length;
    const avgCompletion = progressRows.length > 0
        ? Math.round(progressRows.reduce((sum, r) => sum + r.percent_complete, 0) / progressRows.length)
        : 0;

    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <VolumeCard icon={BookOpen} label="Enrolled" value={activeEnrolments.length} sub={`${inProgress} in progress · ${completed} completed`} />
            <VolumeCard icon={TrendingUp} label="Avg. completion" value={`${avgCompletion}%`} sub="Across your active courses" />
            <VolumeCard
                icon={Award}
                label="Certificates"
                value={certificates}
                sub={certificates === 0 ? 'Finish a course to earn one' : 'Download from each course card'}
            />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MyCoursesPage() {
    const { data, isLoading } = useMyEnrolments();
    const { data: applications } = useMyCourseApplications();
    const { data: progressRows } = useProgressDashboard();
    const { data: myReviews, isSuccess: reviewsLoaded } = useMyReviews();
    const dismissApplication = useDismissCourseApplication();
    const cancelTransferRequest = useCancelTransferRequest();

    const [withdrawingEnrolment, setWithdrawingEnrolment] = useState<Enrolment | null>(null);
    // "Pay now" on the Dashboard links here with ?pay=1 to open the payment window straight away.
    const [searchParams, setSearchParams] = useSearchParams();
    const [isMakingPayment, setIsMakingPayment] = useState(() => searchParams.get('pay') === '1');
    const [reviewingCourse, setReviewingCourse] = useState<{ id: number; title: string } | null>(null);
    const [viewingCertificate, setViewingCertificate] = useState<{ id: number; certificate_number: string; course: { title: string } } | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);
    const [withdrawSuccessMessage, setWithdrawSuccessMessage] = useState<string | null>(null);
    const [paymentSubmittedMessage, setPaymentSubmittedMessage] = useState<string | null>(null);

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

    const activeCount = (data?.data ?? []).filter((e) => e.status !== 'withdrawn' && e.status !== 'transferred').length;
    usePageHeader('My courses', isLoading ? undefined : `${activeCount} active enrolment${activeCount !== 1 ? 's' : ''}`);

    // One-shot: drop ?pay=1 once read, so a refresh or back-navigation doesn't reopen the window.
    useEffect(() => {
        if (searchParams.has('pay')) {
            searchParams.delete('pay');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleCloseProfileModal = () => {
        setShowProfileModal(false);
        sessionStorage.setItem(PROFILE_MODAL_DISMISSED_KEY, '1');
    };

    const handleWithdrawSuccess = (status: string) => {
        if (status === 'transfer_requested') {
            setTransferSuccessMessage("You've already paid for this course — your request has been sent to an admin, who can transfer you to another course.");
        } else if (status === 'withdrawn') {
            setWithdrawSuccessMessage("You've successfully withdrawn from this course.");
        }
    };

    // Low-stakes and reversible (the student can request a transfer again), so it acts straight
    // away — but says so, like the other enrolment actions on this page.
    const handleCancelTransfer = async (enrolment: Enrolment) => {
        await cancelTransferRequest.mutateAsync(enrolment.id);
        setTransferSuccessMessage(`Transfer request cancelled — you're still enrolled in ${enrolment.course.title}.`);
    };

    if (isLoading) return <Spinner />;

    const activeEnrolments = (data?.data ?? []).filter((e) => e.status !== 'withdrawn' && e.status !== 'transferred');
    const payableEnrolments = payableEnrolmentsOf(activeEnrolments);
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

            {/* Page action — only when something is owed; the title and count are in the top bar */}
            {payableEnrolments.length > 0 && (
                <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setIsMakingPayment(true)}>
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        Make a payment
                    </Button>
                </div>
            )}

            {/* Success messages */}
            {transferSuccessMessage && (
                <Alert variant="success" message={transferSuccessMessage} onDismiss={() => setTransferSuccessMessage(null)} />
            )}
            {withdrawSuccessMessage && (
                <Alert variant="success" message={withdrawSuccessMessage} onDismiss={() => setWithdrawSuccessMessage(null)} />
            )}
            {paymentSubmittedMessage && (
                <Alert variant="success" message={paymentSubmittedMessage} onDismiss={() => setPaymentSubmittedMessage(null)} />
            )}

            {/* Overview strip */}
            <OverviewStrip activeEnrolments={activeEnrolments} progressRows={progressRows ?? []} />

            {/* Applications */}
            {sortedApplications.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-ink-900">
                        {allApplicationsPending ? 'Applications' : 'Application updates'}
                    </h2>
                    <p className="text-xs text-ink-600">
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
                // Informational only — "Browse catalogue" on the Dashboard is the way to enrol.
                <EmptyState
                    icon={BookOpen}
                    title="You haven't enrolled in any courses yet"
                    description="Courses you enrol in will appear here."
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
                                reviewsLoaded={reviewsLoaded}
                                onWithdraw={() => setWithdrawingEnrolment(enrolment)}
                                onCancelTransfer={() => handleCancelTransfer(enrolment)}
                                onReview={() => setReviewingCourse({ id: enrolment.course.id, title: enrolment.course.title })}
                                onPay={() => setIsMakingPayment(true)}
                                onViewCertificate={() => {
                                    const certificate = progressByCourseId.get(enrolment.course.id)?.certificate;
                                    if (certificate) setViewingCertificate({ ...certificate, course: { title: enrolment.course.title } });
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {isMakingPayment && payableEnrolments.length > 0 && (
                <MakePaymentModal
                    enrolments={payableEnrolments}
                    onClose={() => setIsMakingPayment(false)}
                    onSubmitted={() =>
                        setPaymentSubmittedMessage("Payment submitted — we'll notify you once an admin confirms it.")
                    }
                />
            )}
            {withdrawingEnrolment && (
                <WithdrawConfirmModal enrolment={withdrawingEnrolment} onClose={() => setWithdrawingEnrolment(null)} onWithdrawSuccess={handleWithdrawSuccess} />
            )}
            <CertificateViewerModal certificate={viewingCertificate} onClose={() => setViewingCertificate(null)} />
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
