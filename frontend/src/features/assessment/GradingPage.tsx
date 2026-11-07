import { useState } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Clock, FileCheck2, Hourglass, PencilLine, RotateCcw } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { DashboardPanel, SectionLabel } from '@/components/dashboard/DashboardPanel';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useGrantExtraAttempts, useGradingQueue, useOutOfAttempts } from '@/features/assessment/useAssessment';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { GradingQueueEntry } from '@/lib/api/types';

/** How many students to list under each item before "and N more". */
const ROWS_PER_ITEM = 5;

function gradingHref(entry: Pick<GradingQueueEntry, 'kind' | 'item_id'>): string {
    return entry.kind === 'assignment' ? `/admin/assignments/${entry.item_id}` : `/admin/evaluations/${entry.item_id}/grading`;
}

function daysWaiting(submittedAt: string | null): number {
    if (!submittedAt) return 0;
    return Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000);
}

/**
 * Everything handed in and waiting for a mark, in one place (admin: all courses; instructor:
 * the courses they teach). Grouped by assignment/quiz so 60 submissions read as a handful of
 * "mark these" piles, oldest first; each pile opens that item's grading page.
 */
export function GradingPage() {
    const { data: queue, isLoading: isLoadingQueue } = useGradingQueue();
    const { data: outOfAttempts, isLoading: isLoadingStuck } = useOutOfAttempts();
    const grant = useGrantExtraAttempts();
    const isLoading = isLoadingQueue || isLoadingStuck;
    const stuck = outOfAttempts ?? [];
    const [courseId, setCourseId] = useState<number | 'all'>('all');
    const [search, setSearch] = useState('');

    const entries = queue ?? [];
    const courses = [...new Map(entries.map((e) => [e.course.id, e.course])).values()].sort((a, b) => a.title.localeCompare(b.title));
    const q = search.trim().toLowerCase();
    const visible = entries.filter(
        (e) => (courseId === 'all' || e.course.id === courseId) && (!q || e.student?.name.toLowerCase().includes(q) || e.student?.email.toLowerCase().includes(q)),
    );

    // One pile per assignment / quiz, the pile with the longest-waiting work first.
    const piles = [...visible.reduce((map, e) => {
        const key = `${e.kind}-${e.item_id}`;
        map.set(key, [...(map.get(key) ?? []), e]);
        return map;
    }, new Map<string, GradingQueueEntry[]>()).values()].sort((a, b) => (a[0].submitted_at ?? '').localeCompare(b[0].submitted_at ?? ''));

    const oldest = Math.max(0, ...visible.map((e) => daysWaiting(e.submitted_at)));
    const assignmentCount = visible.filter((e) => e.kind === 'assignment').length;

    return (
        <PageFrame title="Grading" subtitle={isLoading ? undefined : `${entries.length} waiting for a mark`}>
            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : entries.length === 0 && stuck.length === 0 ? (
                <div className="rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <EmptyState icon={PencilLine} title="All caught up" description="Nothing is waiting for a mark. New submissions and quiz attempts appear here." />
                </div>
            ) : (
                <>
                    <section>
                        <SectionLabel>Overview</SectionLabel>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <VolumeCard icon={PencilLine} label="To grade" value={visible.length} />
                            <VolumeCard icon={FileCheck2} label="Assignments" value={assignmentCount} />
                            <VolumeCard icon={ClipboardList} label="Quizzes" value={visible.length - assignmentCount} sub="Written answers to mark" />
                            <VolumeCard icon={Hourglass} label="Oldest" value={oldest === 0 ? 'Today' : `${oldest}d`} sub="Longest a student has waited" />
                        </div>
                    </section>

                    {/* Course filter + student search */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by course">
                            {[{ id: 'all' as const, title: 'All courses' }, ...courses].map((course) => {
                                const count = course.id === 'all' ? entries.length : entries.filter((e) => e.course.id === course.id).length;
                                const active = courseId === course.id;
                                return (
                                    <button
                                        key={course.id}
                                        type="button"
                                        onClick={() => setCourseId(course.id)}
                                        aria-pressed={active}
                                        className={cn(
                                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                            active ? 'border-blue-600 bg-blue-600 text-white' : 'border-surface-100 bg-surface-0 text-ink-900 hover:border-blue-200',
                                        )}
                                    >
                                        {course.title} <span className={active ? 'text-white/80' : 'text-ink-600'}>({count})</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="ml-auto w-full sm:w-64">
                            <SearchInput value={search} onChange={setSearch} placeholder="Search students…" />
                        </div>
                    </div>

                    {/* Out of attempts — auto-marked quizzes never need a mark, so these students
                        would otherwise be invisible while stuck on a required quiz. */}
                    {stuck.length > 0 && (
                        <DashboardPanel title={`Out of attempts (${stuck.length})`}>
                            <p className="border-b border-surface-100 px-4 py-2 text-xs text-ink-600">
                                These students used every attempt on a quiz without passing, so the next module stays locked until you give them another attempt.
                            </p>
                            <ul className="divide-y divide-surface-100">
                                {stuck.map((entry) => {
                                    const busy = grant.isPending && grant.variables?.evaluationId === entry.evaluation_id && grant.variables?.studentId === entry.student?.id;
                                    return (
                                        <li key={`${entry.evaluation_id}-${entry.student?.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-ink-900">{entry.student?.name ?? 'Student'}</p>
                                                <p className="truncate text-xs text-ink-600">
                                                    Quiz: {entry.evaluation_title} · {entry.course.title} · best {entry.best_score_percent}% (pass {entry.pass_score}%) · {entry.attempts_used} attempts used
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                isLoading={busy}
                                                onClick={() => entry.student && grant.mutate({ evaluationId: entry.evaluation_id, studentId: entry.student.id })}
                                            >
                                                <RotateCcw className="size-3.5" aria-hidden="true" />
                                                Give another attempt
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </DashboardPanel>
                    )}

                    {piles.length === 0 && entries.length > 0 && <p className="py-6 text-center text-sm text-ink-600">No students match your search.</p>}

                    {piles.map((pile) => {
                        const first = pile[0];
                        return (
                            <DashboardPanel
                                key={`${first.kind}-${first.item_id}`}
                                title={`${first.kind === 'assignment' ? 'Assignment' : 'Quiz'} · ${first.item_title}`}
                                action={
                                    <Button size="sm" asChild>
                                        <Link to={`${gradingHref(first)}?from=grading`}>Grade {pile.length}</Link>
                                    </Button>
                                }
                            >
                                <p className="border-b border-surface-100 px-4 py-2 text-xs text-ink-600">
                                    {first.course.title} · Module {first.module.order_index}: {first.module.title}
                                </p>
                                <ul className="divide-y divide-surface-100">
                                    {pile.slice(0, ROWS_PER_ITEM).map((entry) => (
                                        <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                            <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{entry.student?.name ?? 'Student'}</span>
                                            {entry.kind === 'quiz' && <span className="text-xs text-ink-600">Attempt {entry.attempt_number}</span>}
                                            {entry.is_late && <Badge label="Late" tone="warning" icon={Clock} />}
                                            <span className={cn('shrink-0 text-xs', daysWaiting(entry.submitted_at) >= 3 ? 'font-medium text-accent-amber' : 'text-ink-600')}>
                                                {entry.submitted_at ? formatRelativeTime(entry.submitted_at) : '—'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {pile.length > ROWS_PER_ITEM && (
                                    <p className="border-t border-surface-100 px-4 py-2 text-xs text-ink-600">and {pile.length - ROWS_PER_ITEM} more</p>
                                )}
                            </DashboardPanel>
                        );
                    })}
                </>
            )}
        </PageFrame>
    );
}
