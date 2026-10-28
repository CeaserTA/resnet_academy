import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
    AlertTriangle,
    BookOpen,
    CalendarRange,
    CreditCard,
    ClipboardList,
    FileCheck,
    GraduationCap,
    LifeBuoy,
    Plus,
    Star,
    TrendingUp,
    Upload,
    UserCheck,
    UserPlus,
    Users,
    Wallet,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { QuickActionButton, type QuickAction } from '@/components/dashboard/QuickActionButton';
import { DashboardPanel, NeedsActionBand, SectionLabel, ViewAllLink } from '@/components/dashboard/DashboardPanel';
import { PageFrame } from '@/components/layout/PageFrame';
import { AtRiskPanel } from '@/components/dashboard/AtRiskPanel';
import { collectAtRisk, worstAtRiskCourse } from '@/lib/atRisk';
import { useCourses } from '@/features/catalogue/useCourses';
import { fetchCourseAnalytics } from '@/features/analytics/api';
import { useDashboardSummary } from '@/features/admin/dashboard/useDashboard';
import { useOrders, usePaymentSummary } from '@/features/admin/payments/useAdminPayments';
import { useCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useCohorts } from '@/features/cohorts/useCohorts';
import { cohortPhase, daysUntil, displayCohortName } from '@/lib/cohort';
import type { Cohort } from '@/lib/api/types';
import { BulkImportForm } from '@/features/admin/enrolments/BulkImportForm';
import { formatRelativeTime } from '@/lib/utils';
import { describeAuditLogEntry } from '@/lib/auditLog';
import { cn } from '@/lib/utils';
import { formatDateRange } from '@/lib/formatDate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
    if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

// ─── Cohort row ───────────────────────────────────────────────────────────────

function CohortRow({ cohort }: { cohort: Cohort }) {
    const running = cohortPhase(cohort) === 'in_progress';
    const deadlineDays = cohort.application_deadline ? daysUntil(cohort.application_deadline) : null;
    const courseCount = cohort.course_count ?? cohort.courses.length;

    return (
        <li>
            <Link to={`/admin/cohorts/${cohort.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-50">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarRange className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink-900">{displayCohortName(cohort.name)}</span>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', running ? 'bg-blue-600/10 text-blue-600' : 'bg-success-600/10 text-success-600')}>
                            {running ? 'Running' : 'Open'}
                        </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-600">
                        {formatDateRange(cohort.start_date, cohort.end_date)} · {courseCount} course{courseCount === 1 ? '' : 's'}
                        {!running && deadlineDays !== null && deadlineDays >= 0 && ` · apply within ${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`}
                    </span>
                </span>
            </Link>
        </li>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function useDayGreeting() {
    return useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);
}

export function AdminDashboardPage() {
    const greeting = useDayGreeting();
    const { data, isLoading } = useDashboardSummary();
    // The summary endpoint doesn't carry these, so read them from the same endpoints the
    // Applications / Payments / Cohorts pages use.
    const { data: pendingApplications } = useCourseApplications({ status: 'pending' });
    const { data: receivables } = useOrders('pending');
    const { data: paymentSummary } = usePaymentSummary();
    const { data: cohorts } = useCohorts();
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    // Who is at risk, and in which course — the summary only carries the total. Same per-course
    // analytics the instructor dashboard uses, for every published course.
    const { data: coursesData } = useCourses({});
    const publishedCourses = (coursesData?.data ?? []).filter((c) => c.status === 'published');
    const analytics = useQueries({
        queries: publishedCourses.map((course) => ({
            queryKey: ['courses', course.id, 'analytics'],
            queryFn: () => fetchCourseAnalytics(course.id),
        })),
    });
    const atRiskList = collectAtRisk(publishedCourses, analytics.map((q) => q.data));
    const worstCourse = worstAtRiskCourse(atRiskList);

    if (isLoading || !data) {
        return (
            <PageFrame title="Dashboard" subtitle="Overview of your academy">
                <div className="flex h-64 items-center justify-center"><Spinner /></div>
            </PageFrame>
        );
    }

    // The first currency is the headline; any others are listed underneath rather than dropped.
    const [revenue, ...otherRevenue] = data.revenue_by_currency;
    const totalRevenue = revenue ? formatCurrency(revenue.total, revenue.currency) : formatCurrency(0, 'UGX');
    const outstanding = paymentSummary?.by_currency.find((c) => c.currency === (revenue?.currency ?? 'UGX')) ?? paymentSummary?.by_currency[0];
    const revenueSub = [
        ...otherRevenue.map((r) => `+ ${formatCurrency(r.total, r.currency)}`),
        ...(outstanding ? [`${formatCurrency(outstanding.outstanding, outstanding.currency)} still outstanding`] : []),
    ].join(' · ');

    // Certificates ÷ confirmed enrolments — labelled as what it is, not "completion".
    const certificateRate = data.confirmed_enrolments > 0
        ? `${Math.min(Math.round((data.certificates_issued / data.confirmed_enrolments) * 100), 100)}%`
        : '0%';

    const paymentsToReview = receivables?.data.filter((order) => order.pending_submission).length;

    // Cohorts people can still join or are studying in now, soonest first.
    const activeCohorts = (cohorts ?? [])
        .filter((cohort) => cohort.status === 'published' && ['open', 'in_progress'].includes(cohortPhase(cohort)))
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 3);

    // Newest first by when it happened (the API orders by id).
    const recentActivity = [...data.recent_audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const quickActions: QuickAction[] = [
        { to: '/admin/courses/new', label: 'New course', icon: Plus },
        { label: 'Bulk import', icon: Upload, onClick: () => setIsBulkImportOpen(true) },
        { to: '/admin/users', label: 'Provision user', icon: UserPlus },
        { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
    ];

    return (
        <PageFrame title="Dashboard">

            {/* ── Welcome banner ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-navy px-6 py-6 shadow-sm sm:px-8">
                <div className="min-w-0">
                    <p className="text-xs text-navy-foreground/50">{greeting}, Admin</p>
                    <h1 className="font-display text-2xl font-semibold text-navy-foreground sm:text-3xl">Admin Dashboard</h1>
                    <p className="mt-0.5 text-sm text-navy-foreground/70">Overview of your academy</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-navy-foreground">
                            {data.students.toLocaleString()} students
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-navy-foreground">
                            {data.confirmed_enrolments.toLocaleString()} active enrolments
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-navy-foreground">
                            {data.certificates_issued.toLocaleString()} certificates issued
                        </span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
                        <p className="text-xs font-medium text-navy-foreground/60 uppercase tracking-wider">Total Revenue</p>
                        <p className="mt-0.5 text-lg font-bold text-navy-foreground">{totalRevenue}</p>
                    </div>
                </div>
            </div>

            {/* ── Needs action ──────────────────────────────────────────────── */}
            {/* Sits on a tinted band with a stronger label so it reads as "act on this", while the
                Volume row below stays flat on the page background as purely informational. */}
            <NeedsActionBand>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                    <AttentionCard icon={AlertTriangle} label="At-risk students" value={data.at_risk_students} sub="No activity in 14 days" tone={data.at_risk_students > 0 ? 'danger' : 'neutral'} to={worstCourse ? `/admin/courses/${worstCourse.id}/gradebook` : undefined} />
                    <AttentionCard icon={CreditCard} label="Payments" value={paymentsToReview ?? '—'} sub="Receipts to confirm" tone={paymentsToReview ? 'warning' : 'neutral'} to="/admin/payments" />
                    <AttentionCard icon={FileCheck} label="Applications" value={pendingApplications?.meta.total ?? '—'} sub="Waiting for a decision" tone={pendingApplications?.meta.total ? 'warning' : 'neutral'} to="/admin/applications" />
                    <AttentionCard icon={LifeBuoy} label="Open tickets" value={data.open_tickets} sub="Awaiting response" tone={data.open_tickets > 0 ? 'warning' : 'neutral'} to="/tickets" />
                    <AttentionCard icon={Star} label="Pending reviews" value={data.pending_reviews} sub="Awaiting approval" tone={data.pending_reviews > 0 ? 'warning' : 'neutral'} to="/admin/reviews" />
                </div>
            </NeedsActionBand>

            {/* ── Volume metrics ────────────────────────────────────────────── */}
            <section>
                <SectionLabel>Volume</SectionLabel>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <VolumeCard icon={Users} label="Total students" value={data.students.toLocaleString()} accentColor="primary" />
                    <VolumeCard icon={UserCheck} label="Active enrolments" value={data.confirmed_enrolments.toLocaleString()} accentColor="success" />
                    <VolumeCard
                        icon={Wallet}
                        label="Received (MTD)"
                        value={totalRevenue}
                        sub={revenueSub || undefined}
                        accentColor="amber"
                    />
                    <VolumeCard
                        icon={TrendingUp}
                        label="Certificate rate"
                        value={certificateRate}
                        sub={`${data.certificates_issued} of ${data.confirmed_enrolments.toLocaleString()} enrolments`}
                        accentColor="primary"
                    />
                </div>
            </section>

            {/* ── Bottom row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Recent activity — 2/3 */}
                <DashboardPanel title="Recent activity" action={<ViewAllLink to="/admin/audit-log" />} className="lg:col-span-2">

                    {recentActivity.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-ink-600">Nothing logged yet.</p>
                    ) : (
                        <ul className="divide-y divide-surface-100">
                            {recentActivity.map((entry) => (
                                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-50">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar
                                            name={entry.actor?.name ?? 'System'}
                                            src={entry.actor?.avatar_url ?? null}
                                            size="sm"
                                            className="size-7 shrink-0 text-xs"
                                        />
                                        <p className="line-clamp-2 text-sm text-ink-900 sm:line-clamp-1">
                                            {describeAuditLogEntry(entry)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-xs tabular-nums text-ink-600">
                                        {formatRelativeTime(entry.created_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashboardPanel>

                {/* Right column — quick actions + course breakdown */}
                <div className="flex flex-col gap-4">
                    <AtRiskPanel entries={atRiskList} isLoading={!coursesData || analytics.some((q) => q.isLoading)} limit={5} />


                    {/* Quick actions */}
                    <DashboardPanel title="Quick actions">
                        <div className="grid grid-cols-2 gap-2 p-3">
                            {quickActions.map((action) => (
                                <QuickActionButton key={action.label} action={action} />
                            ))}
                        </div>
                    </DashboardPanel>

                    {/* Cohorts */}
                    <DashboardPanel title="Cohorts" action={<ViewAllLink to="/admin/cohorts" label="All cohorts" />}>
                        {activeCohorts.length === 0 ? (
                            <p className="px-4 py-5 text-center text-sm text-ink-600">No open or running cohorts.</p>
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {activeCohorts.map((cohort) => (
                                    <CohortRow key={cohort.id} cohort={cohort} />
                                ))}
                            </ul>
                        )}
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-surface-100 bg-surface-50 px-4 py-2.5 text-xs text-ink-600">
                            <BookOpen className="size-3.5 text-ink-300" aria-hidden="true" />
                            {data.courses_by_status.published ?? 0} published courses
                            <span aria-hidden="true">·</span>
                            <GraduationCap className="size-3.5 text-ink-300" aria-hidden="true" />
                            {data.certificates_issued} certificates issued
                        </p>
                    </DashboardPanel>
                </div>
            </div>

            <Modal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} title="Bulk enrolment import">
                <BulkImportForm onClose={() => setIsBulkImportOpen(false)} />
            </Modal>
        </PageFrame>
    );
}
