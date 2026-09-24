import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Archive, ArrowUpDown, Calendar, ChevronDown, ChevronUp, MoreVertical, Pencil, Plus, Users } from 'lucide-react';
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

function CohortRow({ cohort, onEdit, onError }: { cohort: Cohort; onEdit: () => void; onError: (message: string) => void }) {
    const updateCohort = useUpdateCohort(cohort.id);
    const status = cohortStatusDisplay(cohort.status);

    const handleArchive = () => {
        if (!window.confirm(`Archive "${cohort.name}"? It will no longer be offered to students. You can restore it later from Edit.`)) {
            return;
        }
        updateCohort.mutate(
            { status: 'archived' },
            { onError: () => onError(`Could not archive "${cohort.name}". Try again.`) },
        );
    };

    return (
        <tr className="hover:bg-surface-50">
            <td className="px-4 py-3">
                <Link
                    to={`/admin/cohorts/${cohort.id}`}
                    className="font-medium text-ink-900 hover:text-blue-600"
                >
                    {cohort.name}
                </Link>
            </td>
            <td className="px-4 py-3 text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-ink-300" aria-hidden="true" />
                    {new Date(cohort.start_date).toLocaleDateString()} – {new Date(cohort.end_date).toLocaleDateString()}
                </span>
            </td>
            <td className="px-4 py-3 text-ink-600">
                {cohort.course_count ?? cohort.courses.length}
            </td>
            <td className="px-4 py-3">
                <Badge label={status.label} tone={status.tone} icon={status.icon} />
            </td>
            <td className="px-2 py-3 text-right">
                <DropdownMenu
                    align="right"
                    trigger={(toggle) => (
                        <button
                            onClick={toggle}
                            aria-label={`Actions for ${cohort.name}`}
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
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CohortsListPage() {
    usePageHeader('Cohorts', 'Intakes that offer courses to students — create a cohort, then attach courses to it.');

    const { data: cohorts, isLoading } = useCohorts();
    const [isCreating, setIsCreating] = useState(false);
    const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

    const toggleSort = (key: SortKey) => {
        setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    };

    // Unsorted keeps the API's order; a header click sorts client-side.
    const sortedCohorts = useMemo(() => {
        if (!cohorts || !sort) return cohorts ?? [];
        const factor = sort.dir === 'asc' ? 1 : -1;
        return [...cohorts].sort((a, b) =>
            factor *
            (sort.key === 'dates'
                ? a.start_date.localeCompare(b.start_date)
                : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
        );
    }, [cohorts, sort]);

    return (
        <div className="mx-auto max-w-5xl space-y-4">
            <div className="flex items-center justify-end">
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    New cohort
                </Button>
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
                    title="No cohorts yet"
                    description="Create your first cohort, then assign existing courses to it."
                />
            )}

            {!isLoading && sortedCohorts.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-100 bg-surface-50">
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Cohort</th>
                                <SortHeader label="Dates" active={sort?.key === 'dates'} dir={sort?.dir ?? 'asc'} onClick={() => toggleSort('dates')} />
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Courses</th>
                                <SortHeader label="Status" active={sort?.key === 'status'} dir={sort?.dir ?? 'asc'} onClick={() => toggleSort('status')} />
                                <th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {sortedCohorts.map((cohort) => (
                                <CohortRow
                                    key={cohort.id}
                                    cohort={cohort}
                                    onEdit={() => setEditingCohort(cohort)}
                                    onError={setActionError}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateCohortModal isOpen={isCreating} onClose={() => setIsCreating(false)} />

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
