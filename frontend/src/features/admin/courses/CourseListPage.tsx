import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    BookOpen,
    GraduationCap,
    Grid2x2,
    Layers,
    List,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useCourses } from '@/features/catalogue/useCourses';
import { useDeleteCourse } from '@/features/admin/courses/useAdminCourses';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import type { Course, CourseStatus } from '@/lib/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic gradient from course title — kept for list row thumbnail fallback */
const GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-600',
    'from-amber-400 to-orange-500',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-violet-600',
    'from-lime-500 to-green-600',
];

function gradientForTitle(title: string): string {
    const idx = title.charCodeAt(0) % GRADIENTS.length;
    return GRADIENTS[idx];
}

function formatPrice(price: string, currency: string): string {
    const n = Number(price);
    if (n === 0) return 'Free';
    return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm animate-pulse">
            <div className="aspect-video w-full bg-surface-100" />
            <div className="flex flex-col gap-2 p-3">
                <div className="h-4 w-3/4 rounded bg-surface-100" />
                <div className="h-3 w-1/2 rounded bg-surface-100" />
                <div className="mt-1 h-3 w-1/3 rounded bg-surface-100" />
            </div>
        </div>
    );
}

// ─── Status dot (only shown for non-published) ────────────────────────────────

const STATUS_DOT: Record<CourseStatus, { dot: string; label: string } | null> = {
    published: null, // silence the noise — published is the expected state
    draft: { dot: 'bg-amber-400', label: 'Draft' },
    archived: { dot: 'bg-ink-300', label: 'Archived' },
};

// ─── Course card (grid view) ──────────────────────────────────────────────────

function CourseCard({ course, isAdmin, onDelete }: { course: Course; isAdmin: boolean; onDelete: () => void }) {
    const navigate = useNavigate();
    const statusIndicator = STATUS_DOT[course.status];
    const primaryInstructor = course.instructors[0];

    const handleDelete = () => {
        if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
            onDelete();
        }
    };

    return (
        <div
            onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/courses/${course.id}/edit`)}
            aria-label={`Open ${course.title}`}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600"
        >
            {/* ── Thumbnail ─────────────────────────────────────────────── */}
            <div className="relative h-32 w-full overflow-hidden bg-surface-100">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="size-8 text-ink-300" aria-hidden="true" />
                    </div>
                )}

                {/* Status indicator — only Draft / Archived */}
                {statusIndicator && (
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-surface-0/90 px-2 py-0.5 text-xs font-medium text-ink-900 shadow-sm backdrop-blur-sm">
                        <span className={cn('size-1.5 rounded-full', statusIndicator.dot)} aria-hidden="true" />
                        {statusIndicator.label}
                    </span>
                )}

                {/* Actions menu — stop propagation so clicking it doesn't navigate */}
                <div
                    className="absolute right-2 top-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    <DropdownMenu
                        align="right"
                        trigger={(toggle) => (
                            <button
                                onClick={toggle}
                                aria-label={`Actions for ${course.title}`}
                                className="flex items-center justify-center rounded-lg bg-surface-0/90 p-1.5 text-ink-600 shadow-sm backdrop-blur-sm hover:bg-surface-0"
                            >
                                <MoreVertical className="size-3.5" aria-hidden="true" />
                            </button>
                        )}
                        items={[
                            { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/courses/${course.id}/edit`) },
                            { label: 'Manage modules', icon: Layers, onClick: () => navigate(`/admin/courses/${course.id}/modules`) },
                            ...(isAdmin
                                ? [{ label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: handleDelete }]
                                : []),
                        ]}
                    />
                </div>
            </div>

            {/* ── Card body ─────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-2 p-3">
                {/* Title — 2-line clamp, fixed height so grid rows align */}
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink-900">
                    {course.title}
                </h3>

                {/* Meta row — level + category */}
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                    <span className="capitalize">{course.level}</span>
                    {course.category && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{course.category.name}</span>
                        </>
                    )}
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-1.5 text-xs text-ink-600">
                    {primaryInstructor ? (
                        <>
                            <Avatar name={primaryInstructor.name} src={primaryInstructor.avatar_url} size="sm"
                                className="size-5 text-[10px]" />
                            <span className="truncate">{primaryInstructor.name}</span>
                        </>
                    ) : (
                        <Link
                            to={`/admin/courses/${course.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                            <GraduationCap className="size-3.5" aria-hidden="true" />
                            Assign instructor
                        </Link>
                    )}
                </div>

                {/* Price */}
                <p className="mt-auto pt-1 text-sm font-bold text-ink-900">
                    {formatPrice(course.price, course.currency)}
                </p>
            </div>
        </div>
    );
}

// ─── Course row (list view) ───────────────────────────────────────────────────

function CourseRow({ course, isAdmin, onDelete }: { course: Course; isAdmin: boolean; onDelete: () => void }) {
    const navigate = useNavigate();
    const statusIndicator = STATUS_DOT[course.status];
    const primaryInstructor = course.instructors[0];

    const handleDelete = () => {
        if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
            onDelete();
        }
    };

    return (
        <div
            onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/courses/${course.id}/edit`)}
            className="group flex cursor-pointer items-center gap-4 rounded-xl border border-surface-100 bg-surface-0 px-4 py-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600"
        >
            {/* Thumbnail / gradient */}
            <div className={cn(
                'hidden h-10 w-16 shrink-0 overflow-hidden rounded-lg sm:block',
                !course.thumbnail_url && 'bg-gradient-to-br',
                !course.thumbnail_url && gradientForTitle(course.title),
            )}>
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <span className="text-sm font-bold text-white/80">{course.title.charAt(0)}</span>
                    </div>
                )}
            </div>

            {/* Title + meta */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{course.title}</p>
                    {statusIndicator && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-400">
                            <span className={cn('size-1.5 rounded-full', statusIndicator.dot)} aria-hidden="true" />
                            {statusIndicator.label}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-400">
                    {primaryInstructor?.name ?? <span className="text-blue-600">No instructor</span>}
                    {course.category && <> · {course.category.name}</>}
                </p>
            </div>

            {/* Price */}
            <p className="shrink-0 text-sm font-semibold text-ink-900">
                {formatPrice(course.price, course.currency)}
            </p>

            {/* Actions */}
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <DropdownMenu
                    align="right"
                    trigger={(toggle) => (
                        <button
                            onClick={toggle}
                            aria-label={`Actions for ${course.title}`}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-900"
                        >
                            <MoreVertical className="size-4" aria-hidden="true" />
                        </button>
                    )}
                    items={[
                        { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/courses/${course.id}/edit`) },
                        { label: 'Manage modules', icon: Layers, onClick: () => navigate(`/admin/courses/${course.id}/modules`) },
                        ...(isAdmin
                            ? [{ label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: handleDelete }]
                            : []),
                    ]}
                />
            </div>
        </div>
    );
}

// ─── Status filter chips ──────────────────────────────────────────────────────

const STATUS_FILTERS: { value: CourseStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CourseListPage() {
    const { user } = useAuth();
    const { data, isLoading } = useCourses({});
    const deleteCourse = useDeleteCourse();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isAdmin = user?.role === 'admin';
    const courses = useMemo(() => data?.data ?? [], [data]);

    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (search.trim() && !c.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
            return true;
        });
    }, [courses, search, statusFilter]);

    return (
        <div className="space-y-4">

            {/* ── Page header ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-ink-900">
                        {isAdmin ? 'Courses' : 'My courses'}
                    </h1>
                    <p className="text-xs text-ink-600">
                        {isAdmin
                            ? 'Manage and monitor your curriculum'
                            : 'Manage the courses you teach'}
                    </p>
                </div>
                {isAdmin && (
                    <Link to="/admin/courses/new">
                        <Button size="sm">
                            <Plus className="size-3.5" aria-hidden="true" />
                            New course
                        </Button>
                    </Link>
                )}
            </div>

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-0 flex-1 sm:max-w-48">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search courses…"
                        className="w-full rounded-lg border border-surface-100 bg-surface-0 py-1.5 pl-8 pr-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                    />
                </div>

                {/* Status filter chips */}
                <div className="flex items-center gap-1 rounded-lg border border-surface-100 bg-surface-50 p-0.5">
                    {STATUS_FILTERS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setStatusFilter(value)}
                            className={cn(
                                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                statusFilter === value
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-ink-600 hover:text-ink-900',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Grid / list toggle */}
                <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-0 p-0.5">
                    <button
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                        className={cn(
                            'rounded-md p-1.5 transition-colors',
                            viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-ink-400 hover:text-ink-900',
                        )}
                    >
                        <Grid2x2 className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                        className={cn(
                            'rounded-md p-1.5 transition-colors',
                            viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-ink-400 hover:text-ink-900',
                        )}
                    >
                        <List className="size-3.5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────────────── */}

            {/* Skeleton */}
            {isLoading && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredCourses.length === 0 && (
                <EmptyState
                    icon={BookOpen}
                    title={courses.length === 0 ? 'No courses yet' : 'No courses match this filter'}
                    description={
                        courses.length === 0
                            ? 'Create your first course to get started.'
                            : 'Try a different status filter or clear the search.'
                    }
                    action={
                        courses.length === 0 && isAdmin ? (
                            <Link to="/admin/courses/new">
                                <Button size="sm">
                                    <Plus className="size-3.5" />
                                    New course
                                </Button>
                            </Link>
                        ) : undefined
                    }
                    className="mt-4"
                />
            )}

            {/* Grid view */}
            {!isLoading && filteredCourses.length > 0 && viewMode === 'grid' && (
                <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                >
                    {filteredCourses.map((course) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            isAdmin={isAdmin}
                            onDelete={() => deleteCourse.mutate(course.id)}
                        />
                    ))}
                </div>
            )}

            {/* List view */}
            {!isLoading && filteredCourses.length > 0 && viewMode === 'list' && (
                <div className="flex flex-col gap-2">
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wide text-ink-400">
                        <div className="hidden w-16 shrink-0 sm:block" aria-hidden="true" />
                        <span className="flex-1">Course</span>
                        <span className="shrink-0">Price</span>
                        <span className="w-8 shrink-0" aria-hidden="true" />
                    </div>
                    {filteredCourses.map((course) => (
                        <CourseRow
                            key={course.id}
                            course={course}
                            isAdmin={isAdmin}
                            onDelete={() => deleteCourse.mutate(course.id)}
                        />
                    ))}
                </div>
            )}

            {/* Result count */}
            {!isLoading && filteredCourses.length > 0 && (
                <p className="text-xs text-ink-400">
                    {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
                    {statusFilter !== 'all' && ` · ${statusFilter}`}
                </p>
            )}
        </div>
    );
}
