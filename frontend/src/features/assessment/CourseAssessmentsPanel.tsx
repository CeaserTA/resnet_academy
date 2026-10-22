import { Link } from 'react-router';
import { ClipboardList, FileCheck2, PencilLine, Users } from 'lucide-react';
import { DashboardPanel, SectionLabel, ViewAllLink } from '@/components/dashboard/DashboardPanel';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { assessmentItems, useAssessmentActivity } from '@/features/assessment/useAssessmentActivity';
import { formatDate } from '@/lib/formatDate';
import type { Module } from '@/lib/api/types';

/**
 * Every assignment and quiz of one course on a single page — grouped by module, with how many
 * students have submitted and how many are waiting to be marked — so staff don't have to open
 * each module to find them.
 */
export function CourseAssessmentsPanel({ courseId, modules }: { courseId: number; modules: Module[] }) {
    const items = assessmentItems(modules, courseId, '');
    const { perItem, tasks, isLoading } = useAssessmentActivity(items);
    const counts = perItem.map((p) => ({ isLoading: p.isLoading, data: { submitted: p.submitted, toGrade: p.waiting.length } }));
    const countsLoaded = !isLoading;
    const assignmentCount = items.filter((i) => i.item_type === 'assignment').length;
    const toGradeTotal = tasks.length;

    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                <EmptyState
                    icon={ClipboardList}
                    title="No assessments yet"
                    description="Add an assignment or a quiz to a module on the Modules tab and it will appear here."
                />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section>
                <SectionLabel action={<ViewAllLink to={`/admin/courses/${courseId}/gradebook`} label="Gradebook" />}>Overview</SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <VolumeCard icon={FileCheck2} label="Assignments" value={assignmentCount} />
                    <VolumeCard icon={ClipboardList} label="Quizzes" value={items.length - assignmentCount} />
                    <AttentionCard
                        icon={PencilLine}
                        label="To grade"
                        value={countsLoaded ? toGradeTotal : '—'}
                        sub="Submitted, waiting for a mark"
                        tone={countsLoaded && toGradeTotal > 0 ? 'warning' : 'neutral'}
                    />
                </div>
            </section>

            {modules
                .filter((module) => items.some((item) => item.module.id === module.id))
                .sort((a, b) => a.order_index - b.order_index)
                .map((module) => (
                    <DashboardPanel key={module.id} title={`Module ${module.order_index} · ${module.title}`}>
                        <ul className="divide-y divide-surface-100">
                            {items.map((item, i) => {
                                if (item.module.id !== module.id) return null;
                                const count = counts[i];
                                const isAssignment = item.item_type === 'assignment';
                                return (
                                    <li key={`${item.item_type}-${item.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <Badge
                                            label={isAssignment ? 'Assignment' : 'Quiz'}
                                            tone="progress"
                                            icon={isAssignment ? FileCheck2 : ClipboardList}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{item.title}</p>
                                            <p className="text-xs text-ink-600">
                                                {isAssignment
                                                    ? `${item.due_at ? `Due ${formatDate(item.due_at)}` : 'No due date'} · out of ${Number(item.max_score)}`
                                                    : `Pass mark ${Number(item.pass_score)}%${item.max_attempts ? ` · ${item.max_attempts} attempts` : ''}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            {count?.isLoading ? (
                                                <Spinner className="size-4" />
                                            ) : (
                                                <>
                                                    <span className="flex items-center gap-1 text-ink-600">
                                                        <Users className="size-3.5" aria-hidden="true" />
                                                        {count?.data?.submitted ?? 0} submitted
                                                    </span>
                                                    {(count?.data?.toGrade ?? 0) > 0 && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-accent-amber">
                                                            {count!.data!.toGrade} to grade
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" asChild>
                                                <Link to={isAssignment ? `/admin/assignments/${item.id}` : `/admin/evaluations/${item.id}/grading`}>
                                                    {(count?.data?.toGrade ?? 0) > 0 ? 'Grade' : 'Results'}
                                                </Link>
                                            </Button>
                                            {!isAssignment && (
                                                <Button size="sm" variant="outline" asChild>
                                                    <Link to={`/admin/evaluations/${item.id}`}>Edit</Link>
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </DashboardPanel>
                ))}
        </div>
    );
}
