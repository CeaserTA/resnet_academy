import { useState } from 'react';
import { Link } from 'react-router';
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
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
    danger: { card: 'bg-red-50 border-red-100', icon: 'bg-red-100 text-danger-600', value: 'text-danger-600' },
    warning: { card: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
    neutral: { card: 'bg-surface-0 border-surface-100', icon: 'bg-surface-100 text-ink-400', value: 'text-ink-900' },
};

function AttentionCard({ icon: Icon, label, value, sub, tone, to }: AttentionCardProps) {
    const s = ATTENTION_STYLES[tone];
    const inner = (
        <div className={cn('group flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md', s.card)}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-500">{label}</p>
                <span className={cn('flex size-7 items-center justify-center rounded-lg', s.icon)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                </span>
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', s.value)}>{value}</p>
            <p className="text-xs text-ink-400">{sub}</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
    usePageHeader('Dashboard', 'Overview of your academy');
    const { data, isLoading } = useDashboardSummary();
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    if (isLoading || !data) {
        return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    }

    const totalRevenue =
        data.revenue_by_currency.length > 0
            ? formatCurrency(data.revenue_by_currency[0].total, data.revenue_by_currency[0].currency)
            : '—';

    const avgCompletion = data.confirmed_enrolments > 0
        ? `${Math.min(Math.round((data.certificates_issued / data.confirmed_enrolments) * 100), 100)}%`
        : '0%';

    const quickActions: QuickAction[] = [
        { to: '/admin/courses/new', label: 'New course', icon: Plus },
        { label: 'Bulk import', icon: Upload, onClick: () => setIsBulkImportOpen(true) },
        { to: '/admin/users', label: 'Provision user', icon: UserPlus },
        { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
    ];

    return (
        <div className="max-w-7xl space-y-5">

            {/* ── Needs action ──────────────────────────────────────────────── */}
            <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-400">Needs action</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <AttentionCard icon={AlertTriangle} label="At-risk students" value={data.at_risk_students} sub="No activity in 14 days" tone="danger" to="/admin/courses" />
                    <AttentionCard icon={LifeBuoy} label="Open tickets" value={data.open_tickets} sub="Awaiting response" tone="warning" to="/tickets" />
                    <AttentionCard icon={Star} label="Pending reviews" value={data.pending_reviews} sub="Awaiting approval" tone="neutral" to="/admin/reviews" />
                    <AttentionCard icon={FileCheck} label="Applications" value={data.confirmed_enrolments} sub="Awaiting decision" tone="neutral" to="/admin/applications" />
                </div>
            </section>

            {/* ── Volume metrics ────────────────────────────────────────────── */}
            <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-400">Volume</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <VolumeCard icon={Users} label="Total students" value={data.students.toLocaleString()} />
                    <VolumeCard icon={UserCheck} label="Active enrolments" value={data.confirmed_enrolments.toLocaleString()} />
                    <VolumeCard icon={Wallet} label="Revenue (MTD)" value={totalRevenue} />
                    <VolumeCard icon={TrendingUp} label="Avg. completion" value={avgCompletion} />
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

                    {data.recent_audit_logs.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-ink-400">Nothing logged yet.</p>
                    ) : (
                        <ul className="divide-y divide-surface-100">
                            {data.recent_audit_logs.map((entry) => (
                                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-50">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar
                                            name={entry.actor?.name ?? 'System'}
                                            src={entry.actor?.avatar_url ?? null}
                                            size="sm"
                                            className="size-7 shrink-0 text-xs"
                                        />
                                        <p className="truncate text-sm text-ink-900">
                                            {describeAuditLogEntry(entry)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-xs tabular-nums text-ink-400">
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

                    {/* Course breakdown */}
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Courses</h2>
                        </div>
                        {Object.entries(data.courses_by_status).length === 0 ? (
                            <p className="px-4 py-5 text-center text-sm text-ink-400">No courses yet.</p>
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {Object.entries(data.courses_by_status).map(([status, count]) => (
                                    <li key={status} className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="size-3.5 text-ink-300" aria-hidden="true" />
                                            <span className="text-sm capitalize text-ink-900">{status}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-ink-900">{count}</span>
                                    </li>
                                ))}
                                <li className="flex items-center justify-between bg-surface-50 px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="size-3.5 text-ink-300" aria-hidden="true" />
                                        <span className="text-sm text-ink-600">Certificates issued</span>
                                    </div>
                                    <span className="text-sm font-semibold text-ink-900">{data.certificates_issued}</span>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <Modal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} title="Bulk enrolment import">
                <BulkImportForm onClose={() => setIsBulkImportOpen(false)} />
            </Modal>
        </div>
    );
}
