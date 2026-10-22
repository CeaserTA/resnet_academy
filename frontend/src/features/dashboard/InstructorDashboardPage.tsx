import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import {
    AlertTriangle,
    BookOpen,
    CalendarRange,
    ClipboardList,
    FileCheck,
    GraduationCap,
    LifeBuoy,
    MessageSquare,
    PencilLine,
    Plus,
    TrendingUp,
    Users,
} from 'lucide-react';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { DashboardPanel, NeedsActionBand, SectionLabel, ViewAllLink } from '@/components/dashboard/DashboardPanel';
import { PageFrame } from '@/components/layout/PageFrame';
import { assessmentItems, useAssessmentActivity, useModulesForCourses } from '@/features/assessment/useAssessmentActivity';
import { formatRelativeTime } from '@/lib/utils';
import { AtRiskPanel } from '@/components/dashboard/AtRiskPanel';
import { collectAtRisk, worstAtRiskCourse } from '@/lib/atRisk';
import { QuickActionButton, type QuickAction } from '@/components/dashboard/QuickActionButton';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
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
    const atRiskList = collectAtRisk(myCourses, analytics.map((q) => q.data));

    // Grading queue: every submitted assignment / quiz attempt still waiting for a mark.
    const moduleQueries = useModulesForCourses(myCourses.map((c) => c.id));
    const gradableItems = myCourses.flatMap((course, i) => assessmentItems(moduleQueries[i]?.data ?? [], course.id, course.title));
    const grading = useAssessmentActivity(gradableItems);
    const gradingLoaded = moduleQueries.every((q) => !q.isLoading) && !grading.isLoading;
    const worstCourse = worstAtRiskCourse(atRiskList);
    const count = (n: number) => (analyticsLoaded ? n : '—');

    // Engagement per course (the analytics endpoint counts events over its last 30 days).
    const engagementRows = myCourses
        .map((course, i) => {
            const summary = analytics[i]?.data?.engagement_summary ?? {};
            const lessons = summary.resource_viewed ?? 0;
            const assignments = summary.assignment_submitted ?? 0;
            const quizzes = summary.quiz_attempted ?? 0;
            return { course, lessons, assignments, quizzes, total: lessons + assignments + quizzes };
        })
        .sort((a, b) => b.total - a.total);
    const maxEngagement = Math.max(1, ...engagementRows.map((r) => r.total));

    const subtitle = firstName ? `Welcome back, ${firstName}` : 'Your courses and activity at a glance';

    if (isLoading) {
        return (
            <PageFrame title="Dashboard" subtitle={subtitle}>
                <div className="flex h-64 items-center justify-center"><Spinner /></div>
            </PageFrame>
        );
    }

    const quickActions: QuickAction[] = [
        { label: 'Cohorts', description: 'Intakes running your courses', icon: CalendarRange, to: '/admin/cohorts' },
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
        <PageFrame
            title="Dashboard"
            subtitle={subtitle}
            actions={
                <Button size="sm" asChild>
                    <Link to="/admin/courses/new">
                        <Plus className="size-3.5" aria-hidden="true" />
                        New course
                    </Link>
                </Button>
            }
        >

            {/* ── Needs action — the one blue-tinted block; amber only where something waits ── */}
            <NeedsActionBand>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <AttentionCard
                        icon={PencilLine}
                        label="To grade"
                        value={gradingLoaded ? grading.tasks.length : '—'}
                        sub="Assignments and quizzes handed in"
                        tone={gradingLoaded && grading.tasks.length > 0 ? 'warning' : 'neutral'}
                    />
                    <AttentionCard
                        icon={AlertTriangle}
                        label="At-risk students"
                        value={count(totals.atRisk)}
                        sub="Inactive or falling behind"
                        tone={analyticsLoaded && totals.atRisk > 0 ? 'warning' : 'neutral'}
                        to={worstCourse ? `/admin/courses/${worstCourse.id}/gradebook` : undefined}
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
            </NeedsActionBand>

            {/* ── Your numbers — neutral, informational ── */}
            <section>
                <SectionLabel>Your teaching</SectionLabel>
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
                <SectionLabel>Quick actions</SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map((action) => (
                        <QuickActionButton key={action.label} action={action} />
                    ))}
                </div>
            </section>

            {/* ── Courses (2/3) + at-risk students (1/3) — same bottom row as the admin dashboard ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DashboardPanel title="Your courses" action={<ViewAllLink to="/admin/courses" />} className="lg:col-span-2">

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
                                    <li key={course.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-50">
                                        <Link to={`/admin/courses/${course.id}/modules`} className="flex min-w-0 flex-1 items-center gap-3">
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
                                                    {stats && stats.at_risk_students.length > 0 && (
                                                        <span className="text-accent-amber"> · {stats.at_risk_students.length} at risk</span>
                                                    )}
                                                </span>
                                                {stats && stats.total_students > 0 && (
                                                    <span className="mt-1.5 flex items-center gap-2">
                                                        <ProgressBar percent={stats.completion_rate} className="h-1 max-w-40" />
                                                        <span className="text-[11px] tabular-nums text-ink-600">{Math.round(stats.completion_rate)}% completed</span>
                                                    </span>
                                                )}
                                            </span>
                                        </Link>
                                        <Button size="sm" variant="outline" asChild className="shrink-0">
                                            <Link to={`/admin/courses/${course.id}/gradebook`} aria-label={`Gradebook for ${course.title}`}>
                                                <ClipboardList className="size-3.5" aria-hidden="true" />
                                                <span className="hidden sm:inline">Gradebook</span>
                                            </Link>
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
            </DashboardPanel>

            <div className="flex flex-col gap-4">
                <DashboardPanel title={grading.tasks.length > 0 ? `To grade (${grading.tasks.length})` : 'To grade'}>
                    {!gradingLoaded ? (
                        <div className="flex justify-center py-6"><Spinner /></div>
                    ) : grading.tasks.length === 0 ? (
                        <p className="px-4 py-5 text-center text-sm text-ink-600">Nothing waiting — all work is marked.</p>
                    ) : (
                        <ul className="divide-y divide-surface-100">
                            {grading.tasks.slice(0, 6).map((task) => (
                                <li key={task.key} className="flex items-center gap-3 px-4 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink-900">{task.studentName}</span>
                                        <span className="block truncate text-xs text-ink-600">
                                            {task.kind === 'quiz' ? 'Quiz' : 'Assignment'}: {task.itemTitle} · {task.courseTitle}
                                        </span>
                                        {task.submittedAt && <span className="block text-[11px] text-ink-600">Handed in {formatRelativeTime(task.submittedAt)}</span>}
                                    </span>
                                    <Button size="sm" asChild className="shrink-0">
                                        <Link to={task.href}>Grade</Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashboardPanel>
                <AtRiskPanel entries={atRiskList} isLoading={!analyticsLoaded} />
            </div>
            </div>

            {/* ── Engagement — what students actually did in each course over the last 30 days ── */}
            {myCourses.length > 0 && (
                <DashboardPanel title="Engagement · last 30 days">
                    {!analyticsLoaded ? (
                        <div className="flex justify-center py-6"><Spinner /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="border-b border-surface-100 text-left text-xs font-medium uppercase tracking-wide text-ink-600">
                                        <th className="px-4 py-2.5 font-medium">Course</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Lessons viewed</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Assignments</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Quizzes</th>
                                        <th className="w-1/4 px-4 py-2.5 font-medium">Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {engagementRows.map(({ course, lessons, assignments, quizzes, total }) => (
                                        <tr key={course.id} className="hover:bg-surface-50">
                                            <td className="max-w-0 truncate px-4 py-2.5 font-medium text-ink-900">
                                                <Link to={`/admin/courses/${course.id}/gradebook`} className="hover:text-blue-600">{course.title}</Link>
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-900">{lessons}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-900">{assignments}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-ink-900">{quizzes}</td>
                                            <td className="px-4 py-2.5">
                                                {total === 0 ? (
                                                    <span className="text-xs text-ink-600">No activity</span>
                                                ) : (
                                                    <ProgressBar percent={(total / maxEngagement) * 100} className="h-1.5" />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DashboardPanel>
            )}
        </PageFrame>
    );
}
