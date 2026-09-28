import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Archive, ArrowUpDown, Calendar, ChevronDown, ChevronRight, ChevronUp, MoreVertical, Pencil, Plus, Users } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useCohorts, useUpdateCohort } from './useCohorts';
import { CreateCohortModal } from './CreateCohortModal';
import { EditCohortModal } from './EditCohortModal';
import { cohortStatusDisplay } from '@/lib/statusBadge';
import type { Cohort, CohortStatus } from '@/lib/api/types';
import { formatDate, formatDateRange } from '@/lib/formatDate';
import { daysUntil, displayCohortName } from '@/lib/cohort';

// ─── Sorting ──────────────────────────────────────────────────────────────────

type SortKey = 'dates' | 'status';
type SortDir = 'asc' | 'desc';

// Lifecycle order, so "asc" reads draft → published → archived.
const STATUS_ORDER: Record<CohortStatus, number> = { draft: 0, published: 1, archived: 2 };

/** Same header pattern as the Support page's SortHeader. */
function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
    return (
        <th
            aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className="px-4 py-2.5 text-left"
        >
            <button
                type="button"
                onClick={onClick}
                className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-ink-600 hover:text-ink-900"
            >
                {label}
                {active ? (
                    dir === 'asc'
                        ? <ChevronUp className="size-3" aria-hidden="true" />
                        : <ChevronDown className="size-3" aria-hidden="true" />
                ) : (
                    <ArrowUpDown className="size-3 text-ink-300" aria-hidden="true" />
                )}
            </button>
        </th>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

/** Where the intake stands, in plain words, from its dates. */
function phaseLine(cohort: Cohort): string {
    if (cohort.status === 'archived') return 'No longer offered';
    const toStart = daysUntil(cohort.start_date);
    const toEnd = daysUntil(cohort.end_date);
    if (toEnd < 0) return 'Finished';
    if (toStart <= 0) return 'Running now';
    return toStart === 1 ? 'Starts tomorrow' : `Starts in ${toStart} days`;
}

function CohortRow({ cohort, canManage, onEdit, onError }: { cohort: Cohort; canManage: boolean; onEdit: () => void; onError: (message: string) => void }) {
    const updateCohort = useUpdateCohort(cohort.id);
    const status = cohortStatusDisplay(cohort.status);
    const courseCount = cohort.course_count ?? cohort.courses.length;
    const deadline = cohort.application_deadline ? daysUntil(cohort.application_deadline) : null;
    const navigate = useNavigate();
    const href = `/admin/cohorts/${cohort.id}`;

    const handleArchive = () => {
        if (!window.confirm(`Archive "${displayCohortName(cohort.name)}"? It will no longer be offered to students. You can restore it later from Edit.`)) {
            return;
        }
        updateCohort.mutate(
            { status: 'archived' },
            { onError: () => onError(`Could not archive "${displayCohortName(cohort.name)}". Try again.`) },
        );
    };

    return (
        <tr onClick={() => navigate(href)} className="group cursor-pointer transition-colors hover:bg-blue-50/60">
            <td className="px-4 py-3">
                <Link
                    to={href}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-ink-900 group-hover:text-blue-600"
                >
                    {displayCohortName(cohort.name)}
                </Link>
                <p className="mt-0.5 text-xs text-ink-600">
                    {phaseLine(cohort)}
                    {cohort.status !== 'archived' && deadline !== null && deadline >= 0 && (
                        // The accent colour only when applications close soon — the one thing to act on.
                        <span className={deadline <= 7 ? 'font-medium text-accent-amber' : undefined}>
                            {' · '}Apply by {formatDate(cohort.application_deadline!)}
                        </span>
                    )}
                </p>
            </td>
            <td className="px-4 py-3 text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-ink-300" aria-hidden="true" />
                    {formatDateRange(cohort.start_date, cohort.end_date)}
                </span>
            </td>
            <td className="px-4 py-3 text-ink-600">
                {courseCount} course{courseCount === 1 ? '' : 's'}
            </td>
            <td className="px-4 py-3">
                <Badge label={status.label} tone={status.tone} icon={status.icon} />
            </td>
            {canManage && (
            <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                    align="right"
                    trigger={(toggle) => (
                        <button
                            onClick={toggle}
                            aria-label={`Actions for ${displayCohortName(cohort.name)}`}
                            disabled={updateCohort.isPending}
                            className="rounded-lg p-1.5 text-ink-600 hover:bg-surface-100 hover:text-ink-900 disabled:opacity-50"
                        >
                            <MoreVertical className="size-4" aria-hidden="true" />
                        </button>
                    )}
                    items={[
                        { label: 'Edit', icon: Pencil, onClick: onEdit },
                        ...(cohort.status !== 'archived'
                            ? [{ label: 'Archive', icon: Archive, variant: 'danger' as const, onClick: handleArchive }]
                            : []),
                    ]}
                />
            </td>
            )}
            <td className="w-10 pr-4 text-right">
                <ChevronRight className="ml-auto size-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: CohortStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
];

export function CohortsListPage() {
    const { user } = useAuth();
    // Creating, editing and archiving cohorts is admin-only (CohortPolicy) — instructors browse.
    const canManage = user?.role === 'admin';
    usePageHeader(
        'Cohorts',
        canManage
            ? 'Intakes that offer courses to students — create a cohort, then attach courses to it.'
            : 'Intakes and the courses they offer',
    );

    const { data: cohorts, isLoading } = useCohorts();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CohortStatus | 'all'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

    const toggleSort = (key: SortKey) => {
        setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    // Unsorted keeps the API's order; a header click sorts client-side.
    const sortedCohorts = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = (cohorts ?? []).filter(
            (c) =>
                (statusFilter === 'all' || c.status === statusFilter) &&
                (!term || displayCohortName(c.name).toLowerCase().includes(term)),
        );
        if (!sort) return list;
        const factor = sort.dir === 'asc' ? 1 : -1;
        return [...list].sort((a, b) =>
            factor *
            (sort.key === 'dates'
                ? a.start_date.localeCompare(b.start_date)
                : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
        );
    }, [cohorts, sort, search, statusFilter]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search cohorts…" className="ml-0 sm:w-56" />
                <SegmentedTabs label="Cohort status" value={statusFilter} onChange={setStatusFilter} tabs={STATUS_FILTERS} />
                {canManage && (
                    <Button size="sm" className="ml-auto" onClick={() => setIsCreating(true)}>
                        <Plus className="size-3.5" aria-hidden="true" />
                        New cohort
                    </Button>
                )}
            </div>

            {actionError && <Alert variant="error" message={actionError} />}

            {isLoading && (
                <div className="flex justify-center py-10">
                    <Spinner />
                </div>
            )}

            {!isLoading && sortedCohorts.length === 0 && (
                <EmptyState
                    icon={Users}
                    title={(cohorts ?? []).length === 0 ? 'No cohorts yet' : 'No cohorts match this filter'}
                    description={
                        (cohorts ?? []).length === 0
                            ? canManage ? 'Create your first cohort, then assign existing courses to it.' : 'An admin creates cohorts; they will appear here.'
                            : 'Try a different status or clear the search.'
                    }
                />
            )}

            {!isLoading && sortedCohorts.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="border-b border-surface-100 bg-surface-50">
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Cohort</th>
                                <SortHeader label="Dates" active={sort?.key === 'dates'} dir={sort?.dir ?? 'asc'} onClick={() => toggleSort('dates')} />
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Courses</th>
                                <SortHeader label="Status" active={sort?.key === 'status'} dir={sort?.dir ?? 'asc'} onClick={() => toggleSort('status')} />
                                {canManage && <th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>}
                                <th className="w-10"><span className="sr-only">Open</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {sortedCohorts.map((cohort) => (
                                <CohortRow
                                    key={cohort.id}
                                    cohort={cohort}
                                    canManage={canManage}
                                    onEdit={() => setEditingCohort(cohort)}
                                    onError={setActionError}
                                />
                            ))}
                        </tbody>
                    </table>
                    </div>
                    <div className="border-t border-surface-100 bg-surface-50 px-4 py-2 text-xs text-ink-600">
                        {sortedCohorts.length} cohort{sortedCohorts.length === 1 ? '' : 's'}
                    </div>
                </div>
            )}

            {canManage && <CreateCohortModal isOpen={isCreating} onClose={() => setIsCreating(false)} />}

            {/* Mounted per edit so the modal's form state initialises from the chosen cohort */}
            {editingCohort && (
                <EditCohortModal
                    key={editingCohort.id}
                    isOpen
                    onClose={() => setEditingCohort(null)}
                    cohort={editingCohort}
                />
            )}
        </div>
    );
}
