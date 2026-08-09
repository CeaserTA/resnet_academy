import { useState } from 'react';
import { Link } from 'react-router';
import {
    AlertTriangle,
    ArrowRight,
    Award,
    BookOpen,
    ClipboardList,
    GraduationCap,
    LifeBuoy,
    Plus,
    Star,
    Upload,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import type { BadgeTone } from '@/components/ui/Badge';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { useDashboardSummary } from '@/features/admin/dashboard/useDashboard';
import { BulkImportForm } from '@/features/admin/enrolments/BulkImportForm';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { formatRelativeTime } from '@/lib/utils';
import { describeAuditLogEntry } from '@/lib/auditLog';

const COURSE_STATUS_LABELS: Record<string, string> = {
    published: 'published',
    draft: 'draft',
    archived: 'archived',
};

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

interface StatCardConfig {
    icon: LucideIcon;
    label: string;
    value: string | number;
    tone: BadgeTone;
    sub?: string;
}

interface QuickAction {
    label: string;
    description: string;
    icon: LucideIcon;
    to?: string;
    onClick?: () => void;
}

function QuickActionCard({ action }: { action: QuickAction }) {
    const inner = (
        <div className="flex items-start gap-3 rounded-xl border border-surface-100 bg-surface-0 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                <action.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{action.label}</p>
                <p className="mt-0.5 text-xs text-ink-600">{action.description}</p>
            </div>
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-300" aria-hidden="true" />
        </div>
    );

    if (action.to) {
        return <Link to={action.to}>{inner}</Link>;
    }
    return (
        <button type="button" onClick={action.onClick} className="w-full text-left">
            {inner}
        </button>
    );
}

export function AdminDashboardPage() {
    usePageHeader('Dashboard', 'A system-wide look at Resnet Academy.');
    const { data, isLoading } = useDashboardSummary();
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    if (isLoading || !data) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    const totalCourses = Object.values(data.courses_by_status).reduce(
        (sum, count) => sum + count,
        0,
    );
    const courseBreakdown = Object.entries(data.courses_by_status)
        .map(([status, count]) => `${count} ${COURSE_STATUS_LABELS[status] ?? status}`)
        .join(' · ');

    const statCards: StatCardConfig[] = [
        { icon: Users, label: 'Total students', value: data.students, tone: 'progress' },
        { icon: GraduationCap, label: 'Instructors', value: data.instructors, tone: 'neutral' },
        { icon: BookOpen, label: 'Courses', value: totalCourses, tone: 'neutral', sub: courseBreakdown || 'None yet' },
        { icon: UserCheck, label: 'Confirmed enrolments', value: data.confirmed_enrolments, tone: 'success' },
        { icon: Award, label: 'Certificates issued', value: data.certificates_issued, tone: 'warning' },
        {
            icon: Wallet,
            label: 'Total revenue',
            value:
                data.revenue_by_currency.length > 0
                    ? data.revenue_by_currency.map((r) => formatCurrency(r.total, r.currency)).join(' · ')
                    : formatCurrency(0, 'UGX'),
            tone: 'success',
        },
        { icon: LifeBuoy, label: 'Open tickets', value: data.open_tickets, tone: 'warning' },
        { icon: Star, label: 'Pending reviews', value: data.pending_reviews, tone: 'warning' },
        { icon: AlertTriangle, label: 'At-risk students', value: data.at_risk_students, tone: 'danger' },
    ];

    const quickActions: QuickAction[] = [
        { to: '/admin/courses/new', label: 'New course', description: 'Create and publish a course', icon: Plus },
        { to: '/admin/users', label: 'Provision user', description: 'Add an instructor or admin', icon: Users },
        { label: 'Bulk import', description: 'Enrol students from a CSV', icon: Upload, onClick: () => setIsBulkImportOpen(true) },
        { to: '/admin/audit-log', label: 'Audit log', description: 'Review recent system activity', icon: ClipboardList },
    ];

    return (
        <div className="max-w-7xl space-y-8">

            {/* Stat grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <StatWidget
                        key={stat.label}
                        icon={stat.icon}
                        label={stat.label}
                        value={stat.value}
                        sub={stat.sub}
                        tone={stat.tone}
                    />
                ))}
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="text-base font-semibold text-ink-900">Quick actions</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => (
                        <QuickActionCard key={action.label} action={action} />
                    ))}
                </div>
            </div>

            {/* Recent activity */}
            <div>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-ink-900">Recent activity</h2>
                    <Link
                        to="/admin/audit-log"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                        View all <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {data.recent_audit_logs.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-ink-600">Nothing logged yet.</p>
                    ) : (
                        <ul className="divide-y divide-surface-100">
                            {data.recent_audit_logs.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-semibold text-blue-700">
                                            {entry.actor?.name?.charAt(0).toUpperCase() ?? '?'}
                                        </span>
                                        <p className="truncate text-sm text-ink-900">
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
            </div>

            <Modal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                title="Bulk enrolment import"
            >
                <BulkImportForm onClose={() => setIsBulkImportOpen(false)} />
            </Modal>
        </div>
    );
}
