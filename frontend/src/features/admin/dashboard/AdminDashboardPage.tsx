import { useState } from 'react';
import { Link } from 'react-router';
import {
    AlertTriangle,
    ArrowRight,
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
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { useDashboardSummary } from '@/features/admin/dashboard/useDashboard';
import { useOrders, usePaymentSummary } from '@/features/admin/payments/useAdminPayments';
import { useCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useCohorts } from '@/features/cohorts/useCohorts';
import { cohortPhase, daysUntil, displayCohortName } from '@/lib/cohort';
import type { Cohort } from '@/lib/api/types';
import { BulkImportForm } from '@/features/admin/enrolments/BulkImportForm';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { formatRelativeTime } from '@/lib/utils';
import { describeAuditLogEntry } from '@/lib/auditLog';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
    if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

// ─── Attention card ───────────────────────────────────────────────────────────

interface AttentionCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    sub: string;
    tone: 'danger' | 'warning' | 'neutral';
    to?: string;
}

const ATTENTION_STYLES: Record<AttentionCardProps['tone'], { card: string; icon: string; value: string }> = {
    danger: { card: 'bg-danger-600/5 border-danger-600/15', icon: 'bg-danger-600/10 text-danger-600', value: 'text-danger-600' },
    // accent-amber, not amber-500 — amber-500 is only 2.2:1 on white, too faint for text/icons.
    warning: { card: 'bg-amber-100/50 border-amber-100', icon: 'bg-amber-100 text-accent-amber', value: 'text-accent-amber' },
    neutral: { card: 'bg-surface-0 border-surface-100', icon: 'bg-surface-100 text-ink-600', value: 'text-ink-900' },
};

function AttentionCard({ icon: Icon, label, value, sub, tone, to }: AttentionCardProps) {
    const s = ATTENTION_STYLES[tone];
    const inner = (
        <div className={cn('group flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md', s.card)}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-600">{label}</p>
                <span className={cn('flex size-7 items-center justify-center rounded-lg', s.icon)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', s.value)}>{value}</p>
            <p className="text-xs text-ink-600">{sub}</p>
        </div>
    );
    if (to) return <Link to={to} className="block">{inner}</Link>;
    return inner;
}

// ─── Quick action ─────────────────────────────────────────────────────────────

interface QuickAction { label: string; icon: LucideIcon; to?: string; onClick?: () => void; }

function QuickActionBtn({ action }: { action: QuickAction }) {
    const cls = 'flex items-center gap-2.5 rounded-lg border border-surface-100 bg-surface-0 px-3 py-2.5 text-sm font-medium text-ink-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 w-full';
    const inner = (
        <>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/8 text-blue-600">
                <action.icon className="size-3.5" aria-hidden="true" />
            </span>
            {action.label}
            <ArrowRight className="ml-auto size-3.5 text-ink-300" aria-hidden="true" />
        </>
    );
    if (action.to) return <Link to={action.to} className={cls}>{inner}</Link>;
    return <button type="button" onClick={action.onClick} className={cls}>{inner}</button>;
}

// ─── Cohort row ───────────────────────────────────────────────────────────────

function CohortRow({ cohort }: { cohort: Cohort }) {
    const running = cohortPhase(cohort) === 'in_progress';
    const deadlineDays = cohort.application_deadline ? daysUntil(cohort.application_deadline) : null;
    const short = (d: string) => new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
    const courseCount = cohort.course_count ?? cohort.courses.length;

    return (
        <li>
            <Link to={`/admin/cohorts/${cohort.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-50">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
                        {short(cohort.start_date)} – {short(cohort.end_date)} · {courseCount} course{courseCount === 1 ? '' : 's'}
                        {!running && deadlineDays !== null && deadlineDays >= 0 && ` · apply within ${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`}
                    </span>
                </span>
            </Link>
        </li>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
    usePageHeader('Dashboard', 'Overview of your academy');
    const { data, isLoading } = useDashboardSummary();
    // The summary endpoint doesn't carry these, so read them from the same endpoints the
    // Applications / Payments / Cohorts pages use.
    const { data: pendingApplications } = useCourseApplications({ status: 'pending' });
    const { data: receivables } = useOrders('pending');
    const { data: paymentSummary } = usePaymentSummary();
    const { data: cohorts } = useCohorts();
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    if (isLoading || !data) {
        return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    }

    const revenue = data.revenue_by_currency[0];
    const totalRevenue = revenue ? formatCurrency(revenue.total, revenue.currency) : formatCurrency(0, 'UGX');
    const outstanding = paymentSummary?.by_currency[0];

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
        <div className="max-w-7xl space-y-5">

            {/* ── Needs action ──────────────────────────────────────────────── */}
            {/* Sits on a tinted band with a stronger label so it reads as "act on this", while the
                Volume row below stays flat on the page background as purely informational. */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-700">Needs action</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                    <AttentionCard icon={AlertTriangle} label="At-risk students" value={data.at_risk_students} sub="No activity in 14 days" tone="danger" to="/admin/courses" />
                    <AttentionCard icon={CreditCard} label="Payments" value={paymentsToReview ?? '—'} sub="Receipts to confirm" tone="warning" to="/admin/payments" />
                    <AttentionCard icon={FileCheck} label="Applications" value={pendingApplications?.meta.total ?? '—'} sub="Waiting for a decision" tone="neutral" to="/admin/applications" />
                    <AttentionCard icon={LifeBuoy} label="Open tickets" value={data.open_tickets} sub="Awaiting response" tone="neutral" to="/tickets" />
                    <AttentionCard icon={Star} label="Pending reviews" value={data.pending_reviews} sub="Awaiting approval" tone="neutral" to="/admin/reviews" />
                </div>
            </section>

            {/* ── Volume metrics ────────────────────────────────────────────── */}
            <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-600">Volume</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <VolumeCard icon={Users} label="Total students" value={data.students.toLocaleString()} />
                    <VolumeCard icon={UserCheck} label="Active enrolments" value={data.confirmed_enrolments.toLocaleString()} />
                    <VolumeCard
                        icon={Wallet}
                        label="Received (MTD)"
                        value={totalRevenue}
                        sub={outstanding ? `${formatCurrency(outstanding.outstanding, outstanding.currency)} still outstanding` : undefined}
                    />
                    <VolumeCard
                        icon={TrendingUp}
                        label="Certificate rate"
                        value={certificateRate}
                        sub={`${data.certificates_issued} of ${data.confirmed_enrolments.toLocaleString()} enrolments`}
                    />
                </div>
            </section>

            {/* ── Bottom row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Recent activity — 2/3 */}
                <div className="lg:col-span-2 overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                        <h2 className="text-sm font-semibold text-ink-900">Recent activity</h2>
                        <Link to="/admin/audit-log" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            View all <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>

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
                </div>

                {/* Right column — quick actions + course breakdown */}
                <div className="flex flex-col gap-4">

                    {/* Quick actions */}
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Quick actions</h2>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3">
                            {quickActions.map((action) => (
                                <QuickActionBtn key={action.label} action={action} />
                            ))}
                        </div>
                    </div>

                    {/* Cohorts */}
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Cohorts</h2>
                            <Link to="/admin/cohorts" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                All cohorts <ArrowRight className="size-3" aria-hidden="true" />
                            </Link>
                        </div>
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
                    </div>
                </div>
            </div>

            <Modal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} title="Bulk enrolment import">
                <BulkImportForm onClose={() => setIsBulkImportOpen(false)} />
            </Modal>
        </div>
    );
}
