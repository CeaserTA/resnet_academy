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
    Trash2,
} from 'lucide-react';
import { useAllCourses } from '@/features/catalogue/useCourses';
import { useDeleteCourse } from '@/features/admin/courses/useAdminCourses';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Course, CourseStatus } from '@/lib/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: string, currency: string): string {
    const n = Number(price);
    if (n === 0) return 'Free';
    return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** A course's own page (modules, forum, gradebook) — where a click on a course should land. */
const coursePage = (course: Course) => `/admin/courses/${course.id}/modules`;

// Status in semantic colours; published is the normal state, so it stays quiet (no dot).
const STATUS_STYLE: Record<CourseStatus, { dot: string; label: string }> = {
    published: { dot: 'bg-success-600', label: 'Published' },
    draft: { dot: 'bg-amber-500', label: 'Draft' },
    archived: { dot: 'bg-ink-300', label: 'Archived' },
};

function StatusLabel({ status }: { status: CourseStatus }) {
    const s = STATUS_STYLE[status];
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
            <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden="true" />
            {s.label}
        </span>
    );
}

/** Neutral stand-in when a course has no thumbnail — one brand tint, not a rainbow per title. */
function CourseInitial({ title, className }: { title: string; className?: string }) {
    return (
        <div className={cn('flex items-center justify-center bg-blue-50 font-display font-semibold text-blue-700', className)}>
            {title.charAt(0).toUpperCase()}
        </div>
    );
}

function CourseActions({ course, isAdmin, onDelete, floating }: { course: Course; isAdmin: boolean; onDelete: () => void; floating?: boolean }) {
    const navigate = useNavigate();
    const handleDelete = () => {
        if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
            onDelete();
        }
    };

    return (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu
                align="right"
                trigger={(toggle) => (
                    <button
                        onClick={toggle}
                        aria-label={`Actions for ${course.title}`}
                        className={cn(
                            'flex items-center justify-center rounded-lg p-1.5 text-ink-600 hover:text-ink-900',
                            floating ? 'bg-surface-0/90 shadow-sm backdrop-blur-sm hover:bg-surface-0' : 'hover:bg-surface-100',
                        )}
                    >
                        <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                )}
                items={[
                    { label: 'Open course', icon: Layers, onClick: () => navigate(coursePage(course)) },
                    { label: 'Edit details', icon: Pencil, onClick: () => navigate(`/admin/courses/${course.id}/edit`) },
                    ...(isAdmin
                        ? [{ label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: handleDelete }]
                        : []),
                ]}
            />
        </div>
    );
}

function InstructorLine({ course, isAdmin }: { course: Course; isAdmin: boolean }) {
    const primaryInstructor = course.instructors[0];
    if (primaryInstructor) {
        return (
            <span className="flex min-w-0 items-center gap-1.5">
                <Avatar name={primaryInstructor.name} src={primaryInstructor.avatar_url} size="sm" className="size-5 text-[10px]" />
                <span className="truncate">{primaryInstructor.name}</span>
            </span>
        );
    }
    // Only admins can assign instructors; for them an unstaffed course is worth the accent colour.
    return isAdmin ? (
        <Link
            to={`/admin/courses/${course.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 font-medium text-accent-amber hover:underline"
        >
            <GraduationCap className="size-3.5" aria-hidden="true" />
            Assign instructor
        </Link>
    ) : (
        <span>No instructor</span>
    );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            <div className="h-28 w-full bg-surface-100" />
            <div className="flex flex-col gap-2 p-3">
                <div className="h-4 w-3/4 rounded bg-surface-100" />
                <div className="h-3 w-1/2 rounded bg-surface-100" />
                <div className="mt-1 h-3 w-1/3 rounded bg-surface-100" />
            </div>
        </div>
    );
}

// ─── Course card (grid view) ──────────────────────────────────────────────────

function CourseCard({ course, isAdmin, onDelete }: { course: Course; isAdmin: boolean; onDelete: () => void }) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(coursePage(course))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(coursePage(course))}
            aria-label={`Open ${course.title}`}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600"
        >
            <div className="relative h-28 w-full overflow-hidden">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                    <CourseInitial title={course.title} className="h-full w-full text-3xl" />
                )}
                <div className="absolute right-2 top-2">
                    <CourseActions course={course} isAdmin={isAdmin} onDelete={onDelete} floating />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink-900">{course.title}</h3>
                <p className="truncate text-xs capitalize text-ink-600">
                    {course.level}
                    {course.category && ` · ${course.category.name}`}
                </p>
                <div className="text-xs text-ink-600">
                    <InstructorLine course={course} isAdmin={isAdmin} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-surface-100 pt-2">
                    <StatusLabel status={course.status} />
                    <span className="text-sm font-semibold text-ink-900">{formatPrice(course.price, course.currency)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Course row (list view) ───────────────────────────────────────────────────

const LIST_COLUMNS = 'grid-cols-[minmax(0,1fr)_110px_120px_36px]';

function CourseRow({ course, isAdmin, onDelete }: { course: Course; isAdmin: boolean; onDelete: () => void }) {
    const navigate = useNavigate();

    return (
        <li
            onClick={() => navigate(coursePage(course))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(coursePage(course))}
            className={cn(
                'grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600',
                LIST_COLUMNS,
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="hidden size-10 shrink-0 rounded-lg object-cover sm:block" />
                ) : (
                    <CourseInitial title={course.title} className="hidden size-10 shrink-0 rounded-lg text-base sm:flex" />
                )}
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{course.title}</p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-600">
                        <InstructorLine course={course} isAdmin={isAdmin} />
                        {course.category && <span className="truncate">· {course.category.name}</span>}
                    </div>
                </div>
            </div>
            <StatusLabel status={course.status} />
            <p className="text-right text-sm font-semibold text-ink-900">{formatPrice(course.price, course.currency)}</p>
            <CourseActions course={course} isAdmin={isAdmin} onDelete={onDelete} />
        </li>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: CourseStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
];

export function CourseListPage() {
    const { user } = useAuth();
    const { data, isLoading } = useAllCourses();
    const deleteCourse = useDeleteCourse();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin';
    usePageHeader(
        isAdmin ? 'Courses' : 'My courses',
        isAdmin ? 'Manage and monitor your curriculum' : 'The courses you teach',
    );
    // "My courses" for an instructor means the courses they teach — not the whole catalogue.
    const courses = useMemo(
        () => (data ?? []).filter((c) => isAdmin || c.instructors.some((i) => i.id === user?.id)),
        [data, isAdmin, user?.id],
    );

    const handleDelete = (course: Course) => {
        setDeleteError(null);
        deleteCourse.mutate(course.id, {
            onError: (error) =>
                setDeleteError(error instanceof ApiError ? error.message : `Could not delete "${course.title}". Try again.`),
        });
    };

    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (search.trim() && !c.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
            return true;
        });
    }, [courses, search, statusFilter]);

    const newCourseButton = (
        <Button size="sm" asChild>
            <Link to="/admin/courses/new">
                <Plus className="size-3.5" aria-hidden="true" />
                New course
            </Link>
        </Button>
    );

    return (
        <div className="space-y-4">
            {deleteError && <Alert variant="error" message={deleteError} />}

            {/* ── Toolbar: search + status on the left, view toggle + New course on the right ── */}
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search courses…" className="ml-0 sm:w-56" />
                <SegmentedTabs label="Course status" value={statusFilter} onChange={setStatusFilter} tabs={STATUS_FILTERS} />

                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-0 p-0.5">
                        {([['grid', Grid2x2, 'Grid view'], ['list', List, 'List view']] as const).map(([mode, Icon, label]) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                aria-label={label}
                                aria-pressed={viewMode === mode}
                                className={cn(
                                    'rounded-md p-1.5 transition-colors',
                                    viewMode === mode ? 'bg-blue-600 text-white' : 'text-ink-600 hover:text-ink-900',
                                )}
                            >
                                <Icon className="size-3.5" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                    {newCourseButton}
                </div>
            </div>

            {isLoading && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            )}

            {!isLoading && filteredCourses.length === 0 && (
                <EmptyState
                    icon={BookOpen}
                    title={courses.length === 0 ? 'No courses yet' : 'No courses match this filter'}
                    description={
                        courses.length === 0
                            ? isAdmin ? 'Create your first course to get started.' : "Create a course, or ask an admin to add you to one."
                            : 'Try a different status filter or clear the search.'
                    }
                    action={courses.length === 0 ? newCourseButton : undefined}
                    className="mt-4"
                />
            )}

            {!isLoading && filteredCourses.length > 0 && viewMode === 'grid' && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {filteredCourses.map((course) => (
                        <CourseCard key={course.id} course={course} isAdmin={isAdmin} onDelete={() => handleDelete(course)} />
                    ))}
                </div>
            )}

            {!isLoading && filteredCourses.length > 0 && viewMode === 'list' && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div
                        className={cn(
                            'grid items-center gap-3 border-b border-surface-100 bg-surface-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-600',
                            LIST_COLUMNS,
                        )}
                    >
                        <span>Course</span>
                        <span>Status</span>
                        <span className="text-right">Price</span>
                        <span aria-hidden="true" />
                    </div>
                    <ul className="divide-y divide-surface-100">
                        {filteredCourses.map((course) => (
                            <CourseRow key={course.id} course={course} isAdmin={isAdmin} onDelete={() => handleDelete(course)} />
                        ))}
                    </ul>
                </div>
            )}

            {!isLoading && filteredCourses.length > 0 && (
                <p className="text-xs text-ink-600">
                    {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
                    {statusFilter !== 'all' && ` · ${statusFilter}`}
                </p>
            )}
        </div>
    );
}
