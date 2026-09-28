import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
    ClipboardList,
    FileCheck,
    GraduationCap,
    LifeBuoy,
    MessageSquare,
    Plus,
    TrendingUp,
    Users,
} from 'lucide-react';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { QuickActionButton, type QuickAction } from '@/components/dashboard/QuickActionButton';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useCourses } from '@/features/catalogue/useCourses';
import { useCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useTickets } from '@/features/communication/useCommunication';
import { fetchCourseAnalytics } from '@/features/analytics/api';
import { useAuth } from '@/lib/auth/AuthContext';

/** Course status as text in semantic colours (not the brand/accent palette). */
const STATUS_TEXT: Record<string, string> = {
    published: 'text-success-600',
    draft: 'text-accent-amber',
    archived: 'text-ink-600',
};

/**
 * Instructor home. Colour follows 60-30-10 with the existing tokens:
 *   60% neutral — page (surface-50), cards (surface-0), ink text;
 *   30% brand blue — the Needs-action panel, links, quick-action chips, progress;
 *   10% amber accent — only on a Needs-action card that actually has something waiting.
 * "New course" is offered here; saving a new course also needs the backend's CoursePolicy::create to
 * allow instructors (it was admin-only).
 */
export function InstructorDashboardPage() {
    const { user } = useAuth();
    const firstName = user?.first_name || user?.name?.split(' ')[0] || '';
    usePageHeader('Dashboard', firstName ? `Welcome back, ${firstName}` : 'Your courses and activity at a glance');

    const { data: coursesData, isLoading } = useCourses({});
    const { data: applications } = useCourseApplications();
    const { data: tickets } = useTickets();

    const myCourses = (coursesData?.data ?? []).filter((c) => c.instructors.some((i) => i.id === user?.id));

    // One analytics request per course taught — at-risk list, student and completion counts.
    const analytics = useQueries({
        queries: myCourses.map((course) => ({
            queryKey: ['courses', course.id, 'analytics'],
            queryFn: () => fetchCourseAnalytics(course.id),
        })),
    });
    const analyticsLoaded = analytics.every((q) => !q.isLoading);
    const totals = analytics.reduce(
        (acc, q) => ({
            students: acc.students + (q.data?.total_students ?? 0),
            completed: acc.completed + (q.data?.completed_students ?? 0),
            atRisk: acc.atRisk + (q.data?.at_risk_students.length ?? 0),
        }),
        { students: 0, completed: 0, atRisk: 0 },
    );

    const published = myCourses.filter((c) => c.status === 'published').length;
    const drafts = myCourses.filter((c) => c.status === 'draft').length;
    const pendingApplications = (applications?.data ?? []).filter((a) => a.status === 'pending').length;
    const openTickets = (tickets ?? []).filter((t) => t.status === 'open').length;
    const completionRate = totals.students > 0 ? Math.round((totals.completed / totals.students) * 100) : 0;
    const firstCourse = myCourses[0];
    const count = (n: number) => (analyticsLoaded ? n : '—');

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    }

    const quickActions: QuickAction[] = [
        ...(firstCourse
            ? [{
                label: 'Open gradebook',
                description: myCourses.length === 1 ? firstCourse.title : `${firstCourse.title} (+${myCourses.length - 1} more in My courses)`,
                icon: ClipboardList,
                to: `/admin/courses/${firstCourse.id}/gradebook`,
            }]
            : []),
        {
            label: 'Review applications',
            description: pendingApplications > 0 ? `${pendingApplications} awaiting a decision` : 'Nothing waiting',
            icon: FileCheck,
            to: '/admin/applications',
        },
        {
            label: 'Support tickets',
            description: openTickets > 0 ? `${openTickets} awaiting a response` : 'All answered',
            icon: LifeBuoy,
            to: '/tickets',
        },
        { label: 'Messages', description: 'Students and admins', icon: MessageSquare, to: '/messages' },
    ];

    return (
        <div className="space-y-5">
            {/* Page action — the title is in the top bar */}
            <div className="flex justify-end">
                <Button size="sm" asChild>
                    <Link to="/admin/courses/new">
                        <Plus className="size-3.5" aria-hidden="true" />
                        New course
                    </Link>
                </Button>
            </div>

            {/* ── Needs action — the one blue-tinted block; amber only where something waits ── */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-700">Needs action</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <AttentionCard
                        icon={AlertTriangle}
                        label="At-risk students"
                        value={count(totals.atRisk)}
                        sub="Inactive or falling behind"
                        tone={analyticsLoaded && totals.atRisk > 0 ? 'warning' : 'neutral'}
                        to={firstCourse ? `/admin/courses/${firstCourse.id}/gradebook` : undefined}
                    />
                    <AttentionCard
                        icon={FileCheck}
                        label="Applications"
                        value={pendingApplications}
                        sub="Waiting for a decision"
                        tone={pendingApplications > 0 ? 'warning' : 'neutral'}
                        to="/admin/applications"
                    />
                    <AttentionCard
                        icon={LifeBuoy}
                        label="Open tickets"
                        value={openTickets}
                        sub="Awaiting a response"
                        tone={openTickets > 0 ? 'warning' : 'neutral'}
                        to="/tickets"
                    />
                </div>
            </section>

            {/* ── Your numbers — neutral, informational ── */}
            <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-600">Your teaching</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <VolumeCard
                        icon={BookOpen}
                        label="Courses"
                        value={myCourses.length}
                        sub={`${published} published · ${drafts} draft${drafts === 1 ? '' : 's'}`}
                    />
                    <VolumeCard icon={Users} label="Students" value={count(totals.students)} sub="Across your courses" />
                    <VolumeCard
                        icon={TrendingUp}
                        label="Completion rate"
                        value={analyticsLoaded ? `${completionRate}%` : '—'}
                        sub={analyticsLoaded ? `${totals.completed} of ${totals.students} finished` : 'Loading…'}
                    />
                </div>
            </section>

            {/* ── Quick actions — one row of cards across the full width (2 × 2 on tablets) ── */}
            <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-ink-600">Quick actions</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map((action) => (
                        <QuickActionButton key={action.label} action={action} />
                    ))}
                </div>
            </section>

            {/* ── Courses ── */}
            <div>
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                        <h2 className="text-sm font-semibold text-ink-900">Your courses</h2>
                        <Link to="/admin/courses" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            View all <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>

                    {myCourses.length === 0 ? (
                        <EmptyState
                            icon={GraduationCap}
                            title="No courses yet"
                            description="Create your first course, or an admin can add you to an existing one."
                            action={
                                <Button size="sm" asChild>
                                    <Link to="/admin/courses/new">
                                        <Plus className="size-3.5" aria-hidden="true" />
                                        New course
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-surface-100">
                            {myCourses.slice(0, 6).map((course, i) => {
                                const stats = analytics[i]?.data;
                                return (
                                    <li key={course.id}>
                                        <Link
                                            to={`/admin/courses/${course.id}/modules`}
                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-50"
                                        >
                                            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-100">
                                                {course.thumbnail_url ? (
                                                    <img src={course.thumbnail_url} alt="" className="size-full object-cover" />
                                                ) : (
                                                    <BookOpen className="size-4 text-ink-600" aria-hidden="true" />
                                                )}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-ink-900">{course.title}</span>
                                                <span className="block truncate text-xs text-ink-600">
                                                    <span className={`font-medium capitalize ${STATUS_TEXT[course.status] ?? 'text-ink-600'}`}>
                                                        {course.status}
                                                    </span>
                                                    {course.category && ` · ${course.category.name}`}
                                                    {stats && ` · ${stats.total_students} student${stats.total_students === 1 ? '' : 's'}`}
                                                    {stats && stats.at_risk_students.length > 0 && ` · ${stats.at_risk_students.length} at risk`}
                                                </span>
                                            </span>
                                            <ArrowRight className="size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}
