import { useState } from 'react';
import { Link } from 'react-router';
import { Calendar, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useCohorts } from './useCohorts';
import { CreateCohortModal } from './CreateCohortModal';
import { cohortStatusDisplay } from '@/lib/statusBadge';

export function CohortsListPage() {
    usePageHeader('Cohorts', 'Intakes that offer courses to students — create a cohort, then attach courses to it.');

    const { data: cohorts, isLoading } = useCohorts();
    const [isCreating, setIsCreating] = useState(false);

    return (
        <div className="mx-auto max-w-5xl space-y-4">
            <div className="flex items-center justify-end">
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    New cohort
                </Button>
            </div>

            {isLoading && (
                <div className="flex justify-center py-10">
                    <Spinner />
                </div>
            )}

            {!isLoading && (!cohorts || cohorts.length === 0) && (
                <EmptyState
                    icon={Users}
                    title="No cohorts yet"
                    description="Create your first cohort, then assign existing courses to it."
                    className="py-10"
                />
            )}

            {!isLoading && cohorts && cohorts.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-100 bg-surface-50">
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Cohort</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Dates</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Courses</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {cohorts.map((cohort) => {
                                const status = cohortStatusDisplay(cohort.status);
                                return (
                                    <tr key={cohort.id} className="hover:bg-surface-50">
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
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateCohortModal isOpen={isCreating} onClose={() => setIsCreating(false)} />
        </div>
    );
}
