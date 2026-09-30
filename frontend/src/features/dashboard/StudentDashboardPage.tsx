import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Award, CalendarClock, CheckCircle2, PlayCircle, Receipt, Wallet } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMyEnrolments } from '@/features/enrolment/useEnrolments';
import { useMyCertificates, useProgressDashboard } from '@/features/progress/useProgress';
import { courseProgressStatusDisplay } from '@/lib/statusBadge';
import { financeTotals, formatMoney, paidCourseOrders } from '@/lib/finance';
import { formatDate } from '@/lib/formatDate';

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
    return (
        <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-600">{title}</h2>
            {action}
        </div>
    );
}

/**
 * Student home. Sections, in order: welcome, finance snapshot, continue learning, certificates.
 * Every number comes from data the student portal already loads — enrolments (with their order
 * and payments), the progress dashboard, and certificates — so there are no new endpoints.
 */
export function StudentDashboardPage() {
    const { user } = useAuth();
    const { data: enrolmentsPage, isLoading: loadingEnrolments } = useMyEnrolments();
    const { data: progressRows, isLoading: loadingProgress } = useProgressDashboard();
    const { data: certificates } = useMyCertificates();

    const enrolments = (enrolmentsPage?.data ?? []).filter((e) => e.status !== 'withdrawn' && e.status !== 'transferred');
    const enrolledCourseIds = new Set(enrolments.map((e) => e.course.id));
    // In-progress = not yet completed, in a course the student is still enrolled in.
    const continueRows = (progressRows ?? []).filter((r) => r.status !== 'completed' && enrolledCourseIds.has(r.course.id));
    const certificateCount = certificates?.length ?? 0;
    const finance = financeTotals(paidCourseOrders(enrolments));
    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';

    const contextLine = [
        plural(enrolments.length, 'active enrolment'),
        continueRows.length > 0 && `${continueRows.length} in progress`,
        certificateCount > 0 && plural(certificateCount, 'certificate'),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <PageFrame title="Dashboard" subtitle="Your learning at a glance">
            {/* ── Welcome — same blue panel treatment as the staff dashboards' key section ── */}
            <section className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <Avatar name={user?.name ?? ''} src={user?.avatar_url} size="lg" className="size-14 shrink-0 text-lg ring-4 ring-surface-0" />
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Welcome back</p>
                    <h1 className="truncate text-xl font-semibold text-ink-900">{firstName}</h1>
                    {!loadingEnrolments && <p className="text-sm text-ink-600">{contextLine}</p>}
                </div>
            </section>

            {/* ── Finance snapshot ── */}
            <section>
                <SectionHeading
                    title="Finances"
                    action={
                        <Link to="/payments" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                            See all <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    }
                />
                {loadingEnrolments ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : finance ? (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <VolumeCard icon={Receipt} label="Total owed" value={formatMoney(finance.total, finance.currency)} sub="Across your paid courses" />
                            <VolumeCard icon={Wallet} label="Paid" value={formatMoney(finance.paid, finance.currency)} sub="Confirmed payments" />
                            {/* The accent colour only when there is actually something left to pay. */}
                            <AttentionCard
                                icon={finance.outstanding > 0 ? AlertTriangle : CheckCircle2}
                                label="Outstanding"
                                value={formatMoney(finance.outstanding, finance.currency)}
                                sub={finance.outstanding > 0 ? 'Pay from My courses' : 'Nothing left to pay'}
                                tone={finance.outstanding > 0 ? 'warning' : 'neutral'}
                                to={finance.outstanding > 0 ? '/my-courses' : undefined}
                            />
                        </div>
                        {finance.hasOtherCurrencies && (
                            <p className="mt-2 text-xs text-ink-600">Totals shown in {finance.currency}. See all for payments in other currencies.</p>
                        )}
                    </>
                ) : (
                    <p className="rounded-xl border border-surface-100 bg-surface-0 px-4 py-3 text-sm text-ink-600 shadow-sm">
                        Your courses are free — there's nothing to pay.
                    </p>
                )}
            </section>

            {/* ── Continue learning ── */}
            <section>
                <SectionHeading
                    title="Continue learning"
                    action={
                        <Link to="/my-courses" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                            My courses <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    }
                />
                {loadingProgress ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : continueRows.length === 0 ? (
                    <EmptyState
                        icon={CheckCircle2}
                        title="Nothing in progress"
                        description={enrolments.length > 0 ? "You've finished everything you're enrolled in." : 'Courses you enrol in will appear here.'}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {continueRows.map((row) => {
                            const status = courseProgressStatusDisplay(row.status);
                            const percent = Math.round(row.percent_complete);
                            const upcoming = row.status === 'upcoming' && row.starts_on;
                            return (
                                <article key={row.course.id} className="flex flex-col gap-3 rounded-xl border border-surface-100 bg-surface-0 p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">{row.course.title}</h3>
                                        <Badge label={status.label} tone={status.tone} icon={status.icon} className="shrink-0" />
                                    </div>
                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
                                            <span>Progress</span>
                                            <span className="font-semibold text-ink-900">{percent}%</span>
                                        </div>
                                        <ProgressBar percent={percent} />
                                    </div>
                                    {upcoming ? (
                                        <p className="mt-auto flex items-center gap-1.5 text-xs text-ink-600">
                                            <CalendarClock className="size-3.5" aria-hidden="true" />
                                            Starts {formatDate(row.starts_on!)}
                                        </p>
                                    ) : (
                                        // Course-level progress only (no "last accessed" item in the data), so this opens
                                        // the course page, which leads with "Continue where you left off".
                                        <Link
                                            to={`/learn/courses/${row.course.id}`}
                                            className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                                        >
                                            <PlayCircle className="size-4" aria-hidden="true" />
                                            {percent === 0 ? 'Start' : 'Continue'}
                                        </Link>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Certificates teaser — only once there is one ── */}
            {certificateCount > 0 && (
                <section>
                    <SectionHeading title="Certificates" />
                    <Link
                        to="/certificates"
                        className="group flex items-center gap-4 rounded-xl border border-surface-100 bg-surface-0 px-4 py-3 shadow-sm transition-colors hover:border-blue-100 hover:bg-blue-50"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Award className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink-900">
                                You've earned {plural(certificateCount, 'certificate')}
                            </span>
                            <span className="block truncate text-xs text-ink-600">
                                {certificates!.map((c) => c.course.title).join(' · ')}
                            </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600">
                            View
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                    </Link>
                </section>
            )}
        </PageFrame>
    );
}
