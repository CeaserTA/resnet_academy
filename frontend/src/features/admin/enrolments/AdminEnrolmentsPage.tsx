import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useCourses } from '@/features/catalogue/useCourses';
import { useAdminEnrolments, useUpdateEnrolmentStatus } from '@/features/admin/enrolments/useAdminEnrolments';
import { enrolmentStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { AdminEnrolment, EnrolmentStatus } from '@/lib/api/types';

type StatusTab = 'all' | EnrolmentStatus;

const STATUS_TABS: ReadonlyArray<readonly [StatusTab, string]> = [
    ['all', 'All'],
    ['confirmed', 'Confirmed'],
    ['waitlisted', 'Waitlisted'],
    ['withdrawn', 'Withdrawn'],
];

/**
 * Enrolments created from an approved application keep source "self" in the database — the
 * enrolment pipeline is shared — so the "Approved Application" label is derived from the
 * course's enrolment policy instead.
 */
function sourceLabel(enrolment: AdminEnrolment): string {
    if (enrolment.source === 'admin_bulk') return 'Admin Import';
    return enrolment.course.enrolment_policy === 'application' ? 'Approved Application' : 'Self Enrolled';
}

export function AdminEnrolmentsPage() {
    usePageHeader('Enrolments', 'Every participant across instant and application-based courses.');

    const [courseId, setCourseId] = useState<number | ''>('');
    const [tab, setTab] = useState<StatusTab>('all');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const { data: courses } = useCourses({});

    // Debounce the search box so every keystroke doesn't fire a request.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, isLoading, isFetching } = useAdminEnrolments({
        course_id: courseId === '' ? undefined : courseId,
        status: tab === 'all' ? undefined : tab,
        search: search || undefined,
        page,
    });
    const updateStatus = useUpdateEnrolmentStatus();

    // Any filter change jumps back to the first page.
    useEffect(() => {
        setPage(1);
    }, [courseId, tab, search]);

    const enrolments = data?.data ?? [];
    const meta = data?.meta;

    const handleChangeStatus = (enrolment: AdminEnrolment, status: EnrolmentStatus) => {
        updateStatus.mutate({ enrolmentId: enrolment.id, status });
    };

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Enrolments / Roster</h1>
                <p className="text-xs text-ink-400">
                    Every participant across instant and application-based courses.
                </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value === '' ? '' : Number(e.target.value))}
                    aria-label="Filter by course"
                    className="rounded-lg border border-surface-100 bg-surface-0 px-3 py-1.5 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    <option value="">All courses</option>
                    {(courses?.data ?? []).map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5">
                    {STATUS_TABS.map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setTab(value)}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="relative ml-auto w-full max-w-56">
                    <Search
                        className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-600"
                        aria-hidden="true"
                    />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name or email"
                        aria-label="Search students by name or email"
                        className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-ink-900 transition focus-visible:bg-surface-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </div>
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && enrolments.length === 0 && (
                <EmptyState icon={Users} title="No enrolments" description="Nothing matches these filters." className="mt-6" />
            )}

            {!isLoading && enrolments.length > 0 && (
                <div className={cn('overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm', isFetching && 'opacity-70')}>
                    {/* Column headers */}
                    <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1.2fr)_minmax(130px,1fr)_110px_80px_100px_140px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Course</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Source</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Progress</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Enrolled</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Actions</span>
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {enrolments.map((enrolment) => {
                            const status = enrolmentStatusDisplay(enrolment.status);

                            return (
                                <li
                                    key={enrolment.id}
                                    className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1.2fr)_minmax(130px,1fr)_110px_80px_100px_140px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                                >
                                    {/* Student */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar name={enrolment.student.name} size="sm" className="size-7 shrink-0 text-xs" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-900">{enrolment.student.name}</p>
                                            <p className="truncate text-xs text-ink-400">{enrolment.student.email}</p>
                                        </div>
                                    </div>

                                    {/* Course & section */}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-ink-900">{enrolment.course.title}</p>
                                        <p className="truncate text-xs text-ink-400">{enrolment.section?.name ?? 'Self-paced'}</p>
                                    </div>

                                    {/* Source */}
                                    <p className="truncate text-sm text-ink-600">{sourceLabel(enrolment)}</p>

                                    {/* Status */}
                                    <Badge label={status.label} tone={status.tone} icon={status.icon} />

                                    {/* Progress */}
                                    <p className="text-right font-mono text-xs text-ink-600">
                                        {Math.round(enrolment.progress_percent)}%
                                    </p>

                                    {/* Enrolled date */}
                                    <p className="text-right font-mono text-xs text-ink-400">
                                        {new Date(enrolment.applied_at).toLocaleDateString()}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1">
                                        {enrolment.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleChangeStatus(enrolment, 'withdrawn')}
                                                disabled={updateStatus.isPending}
                                                aria-label={`Revoke enrolment for ${enrolment.student.name}`}
                                                className="rounded-lg border border-surface-100 px-2 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600/10 disabled:opacity-50"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                        {enrolment.status === 'waitlisted' && (
                                            <button
                                                onClick={() => handleChangeStatus(enrolment, 'confirmed')}
                                                disabled={updateStatus.isPending}
                                                aria-label={`Confirm enrolment for ${enrolment.student.name}`}
                                                className="rounded-lg border border-surface-100 px-2 py-1 text-xs font-medium text-success-600 transition-colors hover:bg-success-600/10 disabled:opacity-50"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        {enrolment.status === 'withdrawn' && (
                                            <button
                                                onClick={() => handleChangeStatus(enrolment, 'confirmed')}
                                                disabled={updateStatus.isPending}
                                                aria-label={`Restore enrolment for ${enrolment.student.name}`}
                                                className="rounded-lg border border-surface-100 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600/10 disabled:opacity-50"
                                            >
                                                Restore
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-surface-100 px-4 py-2.5">
                            <p className="text-xs text-ink-400">
                                Page {meta.current_page} of {meta.last_page} · {meta.total} enrolments
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={meta.current_page <= 1}
                                    aria-label="Previous page"
                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 disabled:opacity-40"
                                >
                                    <ChevronLeft className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                                    disabled={meta.current_page >= meta.last_page}
                                    aria-label="Next page"
                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface-100 disabled:opacity-40"
                                >
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
