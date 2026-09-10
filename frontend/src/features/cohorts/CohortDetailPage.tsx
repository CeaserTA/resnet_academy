import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useCohort, useCohortAnalytics } from './useCohorts';
import { EditCohortModal } from './EditCohortModal';
import { AttachCourseModal } from './AttachCourseModal';
import { EditCohortCourseModal } from './EditCohortCourseModal';
import { DetachCohortCourseDialog } from './DetachCohortCourseDialog';
import { cohortStatusDisplay, cohortCourseStatusDisplay } from '@/lib/statusBadge';
import type { CohortCourse } from '@/lib/api/types';

export function CohortDetailPage() {
    const { id } = useParams();
    const cohortId = Number(id);
    const { data: cohort, isLoading } = useCohort(cohortId);
    const { data: report } = useCohortAnalytics(cohortId);

    usePageHeader(cohort?.name ?? 'Cohort', 'Courses offered in this cohort, and who has completed them.');

    const [isEditingCohort, setIsEditingCohort] = useState(false);
    const [isAttaching, setIsAttaching] = useState(false);
    const [editingCohortCourse, setEditingCohortCourse] = useState<CohortCourse | null>(null);
    const [detachingCohortCourse, setDetachingCohortCourse] = useState<CohortCourse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    if (isLoading || !cohort) {
        return (
            <div className="flex justify-center py-16">
                <Spinner />
            </div>
        );
    }

    const status = cohortStatusDisplay(cohort.status);
    const reportByCohortCourseId = new Map((report?.courses ?? []).map((row) => [row.cohort_course_id, row]));

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link to="/admin/cohorts" className="flex items-center gap-1 text-sm text-ink-400 hover:text-blue-600">
                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                        Cohorts
                    </Link>
                    <span className="text-ink-300" aria-hidden="true">/</span>
                    <h1 className="text-base font-semibold text-ink-900">{cohort.name}</h1>
                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                </div>

                <Button variant="secondary" size="sm" onClick={() => setIsEditingCohort(true)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit cohort
                </Button>
            </div>

            <p className="text-sm text-ink-600">
                {new Date(cohort.start_date).toLocaleDateString()} – {new Date(cohort.end_date).toLocaleDateString()}
                {cohort.application_deadline && (
                    <> · Applications close {new Date(cohort.application_deadline).toLocaleDateString()}</>
                )}
            </p>

            {errorMessage && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
            )}

            {report && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <StatWidget icon={Users} label="Enrolled" value={report.totals.total_enrolled} tone="progress" />
                    <StatWidget icon={Users} label="Completed" value={report.totals.completed} tone="success" />
                    <StatWidget icon={Users} label="In progress" value={report.totals.in_progress} tone="progress" />
                    <StatWidget icon={Users} label="Withdrawn" value={report.totals.withdrawn} tone="neutral" />
                    <StatWidget icon={Users} label="Waitlisted" value={report.totals.waitlisted} tone="warning" />
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-ink-900">Courses in this cohort</h2>
                        <p className="text-xs text-ink-400">
                            {cohort.courses.length} course{cohort.courses.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setIsAttaching(true)}>
                        <Plus className="size-3.5" aria-hidden="true" />
                        Add course
                    </Button>
                </div>

                {cohort.courses.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title="No courses attached yet"
                        description="Add an existing course to offer it under this cohort."
                        className="py-10"
                    />
                )}

                {cohort.courses.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-100 bg-surface-50">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Course</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Status</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Seats</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Price</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Completed</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-ink-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {cohort.courses.map((cohortCourse) => {
                                    const cc = cohortCourseStatusDisplay(cohortCourse.status);
                                    const row = reportByCohortCourseId.get(cohortCourse.id);
                                    return (
                                        <tr key={cohortCourse.id} className="hover:bg-surface-50">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-ink-900">{cohortCourse.course?.title}</span>
                                                {cohortCourse.primary_instructor && (
                                                    <p className="text-xs text-ink-400">{cohortCourse.primary_instructor.name}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge label={cc.label} tone={cc.tone} icon={cc.icon} />
                                            </td>
                                            <td className="px-4 py-3 text-ink-600">
                                                {cohortCourse.seats_taken}/{cohortCourse.capacity ?? '∞'}
                                            </td>
                                            <td className="px-4 py-3 text-ink-600">
                                                {cohortCourse.price} {cohortCourse.currency}
                                                {cohortCourse.price_override !== null && (
                                                    <span className="ml-1 text-xs text-blue-600">(override)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-ink-600">
                                                {row ? `${row.completed}/${row.total_enrolled}` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingCohortCourse(cohortCourse)}
                                                        className="rounded p-1.5 text-ink-400 hover:bg-surface-100 hover:text-blue-600"
                                                        aria-label={`Edit ${cohortCourse.course?.title}`}
                                                    >
                                                        <Pencil className="size-3.5" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDetachingCohortCourse(cohortCourse)}
                                                        className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                                                        aria-label={`Remove ${cohortCourse.course?.title}`}
                                                    >
                                                        <Trash2 className="size-3.5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <EditCohortModal isOpen={isEditingCohort} onClose={() => setIsEditingCohort(false)} cohort={cohort} />

            <AttachCourseModal
                isOpen={isAttaching}
                onClose={() => setIsAttaching(false)}
                cohortId={cohortId}
                excludeCourseIds={cohort.courses.map((c) => c.course_id)}
            />

            {editingCohortCourse && (
                <EditCohortCourseModal
                    isOpen={true}
                    onClose={() => setEditingCohortCourse(null)}
                    cohortId={cohortId}
                    cohortCourse={editingCohortCourse}
                />
            )}

            {detachingCohortCourse && (
                <DetachCohortCourseDialog
                    isOpen={true}
                    onClose={() => setDetachingCohortCourse(null)}
                    cohortId={cohortId}
                    cohortCourse={detachingCohortCourse}
                    onError={handleError}
                />
            )}
        </div>
    );
}
