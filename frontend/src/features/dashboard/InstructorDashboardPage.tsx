import { Link } from 'react-router';
import {
    ArrowRight,
    BookOpen,
    FileCheck,
    GraduationCap,
    MessageSquare,
    Plus,
    TrendingUp,
} from 'lucide-react';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useCourses } from '@/features/catalogue/useCourses';
import { useCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useAuth } from '@/lib/auth/AuthContext';

export function InstructorDashboardPage() {
    usePageHeader('Dashboard', 'Your courses and activity at a glance');
    const { user } = useAuth();
    const { data: coursesData, isLoading } = useCourses({});
    const { data: applications } = useCourseApplications();

    const courses = coursesData?.data ?? [];
    const myCourses = courses.filter((c) =>
        c.instructors.some((i) => i.id === user?.id),
    );

    const published = myCourses.filter((c) => c.status === 'published').length;
    const drafts = myCourses.filter((c) => c.status === 'draft').length;
    const pending = (applications ?? []).filter((a) => a.status === 'pending').length;

    const statusColor: Record<string, string> = {
        published: 'text-success-600',
        draft: 'text-amber-600',
        archived: 'text-ink-400',
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    }

    return (
        <div className="max-w-7xl space-y-5">

            {/* ── Welcome header ──────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl shadow-sm">
                <div className="flex items-center gap-4 bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-5">
                    <Avatar
                        name={user?.name ?? 'I'}
                        src={user?.avatar_url}
                        size="lg"
                        className="size-12 shrink-0 ring-2 ring-white/30"
                    />
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-100">Welcome back</p>
                        <h1 className="text-base font-semibold text-white">{user?.name}</h1>
                        <p className="text-xs text-blue-100">
                            {published} published · {drafts} draft{drafts !== 1 ? 's' : ''} · {pending} pending application{pending !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link
                        to="/admin/courses/new"
                        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30"
                    >
                        <Plus className="size-3.5" aria-hidden="true" />
                        New course
                    </Link>
                </div>
            </div>

            {/* ── Stat strip ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatWidget icon={BookOpen} label="My courses" value={myCourses.length} tone="progress" />
                <StatWidget icon={TrendingUp} label="Published" value={published} tone="success" />
                <StatWidget icon={GraduationCap} label="Drafts" value={drafts} tone="warning" />
                <StatWidget icon={FileCheck} label="Pending applications" value={pending} tone={pending > 0 ? 'danger' : 'neutral'} />
            </div>

            {/* ── Bottom two-column row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Course grid — 2/3 */}
                <div className="lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink-900">Your courses</h2>
                        <Link to="/admin/courses" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            Manage all <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>

                    {myCourses.length === 0 ? (
                        <EmptyState
                            icon={BookOpen}
                            title="No courses yet"
                            description="Create your first course to get started."
                            action={
                                <Link
                                    to="/admin/courses/new"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    + New course
                                </Link>
                            }
                        />
                    ) : (
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                            {myCourses.slice(0, 6).map((course) => (
                                <Link
                                    key={course.id}
                                    to={`/admin/courses/${course.id}/modules`}
                                    className="group flex flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    {/* Thumbnail */}
                                    <div className="h-24 w-full overflow-hidden bg-surface-100">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt=""
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="size-7 text-ink-300" aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Body */}
                                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                                        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink-900">
                                            {course.title}
                                        </h3>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={`text-xs font-medium capitalize ${statusColor[course.status] ?? 'text-ink-400'}`}>
                                                {course.status}
                                            </span>
                                            {course.category && (
                                                <span className="truncate text-xs text-ink-400">{course.category.name}</span>
                                            )}
                                        </div>
                                        <p className="mt-auto text-sm font-bold text-ink-900">
                                            {Number(course.price) === 0
                                                ? 'Free'
                                                : `${course.currency} ${Number(course.price).toLocaleString()}`}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right column — quick actions ─────────────────────────── */}
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                        <h2 className="text-sm font-semibold text-ink-900">Quick actions</h2>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3">
                        {[
                            {
                                to: '/admin/courses/new',
                                label: 'New course',
                                desc: 'Start building your next course',
                                icon: Plus,
                            },
                            {
                                to: '/admin/applications',
                                label: 'Review applications',
                                desc: pending > 0 ? `${pending} awaiting decision` : 'No pending applications',
                                icon: FileCheck,
                            },
                            {
                                to: '/messages',
                                label: 'Messages',
                                desc: 'View student and admin messages',
                                icon: MessageSquare,
                            },
                        ].map(({ to, label, desc, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className="flex items-center gap-2.5 rounded-lg border border-surface-100 bg-surface-0 px-3 py-2.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/8 text-blue-600">
                                    <Icon className="size-3.5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-ink-900">{label}</p>
                                    <p className="truncate text-xs text-ink-400">{desc}</p>
                                </div>
                                <ArrowRight className="ml-auto size-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
