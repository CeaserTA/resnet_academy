import { Link } from 'react-router';
import {
    AlertTriangle,
    Award,
    BookOpen,
    ClipboardList,
    FolderTree,
    GraduationCap,
    LifeBuoy,
    Plus,
    Upload,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { BadgeTone } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { useDashboardSummary } from '@/features/admin/dashboard/useDashboard';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { formatRelativeTime } from '@/lib/utils';

const COURSE_STATUS_LABELS: Record<string, string> = {
    published: 'published',
    draft: 'draft',
    archived: 'archived',
};

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

interface StatCardConfig {
    icon: LucideIcon;
    label: string;
    value: string | number;
    tone: BadgeTone;
    sub?: string;
}

/**
 * Admin landing page: system-wide stat cards, quick actions to the screens admins reach for
 * most, and a recent-activity feed from the audit log. Full-width container (no narrow
 * centered column) so the stat grid actually uses a wide desktop screen. Title/subtitle live in
 * the top bar (see `usePageHeader`) rather than an in-body heading.
 */
export function AdminDashboardPage() {
    usePageHeader('Dashboard', 'A system-wide look at Resnet LMS.');
    const { data, isLoading } = useDashboardSummary();

    if (isLoading || !data) {
        return <Spinner />;
    }

    const totalCourses = Object.values(data.courses_by_status).reduce((sum, count) => sum + count, 0);
    const courseBreakdown = Object.entries(data.courses_by_status)
        .map(([status, count]) => `${count} ${COURSE_STATUS_LABELS[status] ?? status}`)
        .join(' · ');

    const statCards: StatCardConfig[] = [
        { icon: Users, label: 'Students', value: data.students, tone: 'progress' },
        { icon: GraduationCap, label: 'Instructors', value: data.instructors, tone: 'neutral' },
        { icon: BookOpen, label: 'Courses', value: totalCourses, sub: courseBreakdown || 'None yet', tone: 'neutral' },
        { icon: UserCheck, label: 'Confirmed enrolments', value: data.confirmed_enrolments, tone: 'success' },
        { icon: Award, label: 'Certificates issued', value: data.certificates_issued, tone: 'warning' },
        {
            icon: Wallet,
            label: 'Revenue',
            value:
                data.revenue_by_currency.length > 0
                    ? data.revenue_by_currency.map((row) => formatCurrency(row.total, row.currency)).join(' · ')
                    : formatCurrency(0, 'UGX'),
            tone: 'success',
        },
        { icon: LifeBuoy, label: 'Open tickets', value: data.open_tickets, tone: 'warning' },
        { icon: AlertTriangle, label: 'At-risk students', value: data.at_risk_students, tone: 'danger' },
    ];

    const quickActions = [
        { to: '/admin/courses/new', label: 'New course', icon: Plus },
        { to: '/admin/users', label: 'Provision user', icon: Users },
        { to: '/admin/enrolments/import', label: 'Bulk import', icon: Upload },
        { to: '/admin/categories', label: 'Categories', icon: FolderTree },
        { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
    ];

    return (
        <div className="max-w-7xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <StatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} sub={stat.sub} tone={stat.tone} />
                ))}
            </div>

            <h2 className="mt-8 text-lg">Quick actions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                    <Link key={action.to} to={action.to}>
                        <Button variant="secondary">
                            <action.icon className="size-4" aria-hidden="true" />
                            {action.label}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
                <h2 className="text-lg">Recent activity</h2>
                <Link to="/admin/audit-log" className="text-sm text-blue-600 hover:underline">
                    View full audit log
                </Link>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-surface-100 rounded-lg border border-surface-100 bg-surface-0">
                {data.recent_audit_logs.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-600">Nothing logged yet.</p>}
                {data.recent_audit_logs.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <p className="truncate text-sm text-ink-900">
                            <span className="font-medium">{entry.actor?.name ?? 'System'}</span> — {entry.action} ({entry.entity_type} #
                            {entry.entity_id})
                        </p>
                        <p className="shrink-0 text-xs text-ink-600">{formatRelativeTime(entry.created_at)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
