import { Link } from 'react-router';
import { CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCohortCoursesForCourse } from './useCohorts';
import { cohortCourseStatusDisplay } from '@/lib/statusBadge';

interface CourseCohortsPanelProps {
    courseId: number;
}

/**
 * Read-only: which cohorts is this course offered in — course-to-cohort is a secondary
 * lookup now, managed from the cohort side (/admin/cohorts/:id), not here.
 */
export function CourseCohortsPanel({ courseId }: CourseCohortsPanelProps) {
    const { data: cohortCourses, isLoading } = useCohortCoursesForCourse(courseId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <Spinner />
            </div>
        );
    }

    if (!cohortCourses || cohortCourses.length === 0) {
        return (
            <EmptyState
                icon={CalendarRange}
                title="Not offered in any cohort yet"
                description="Go to Cohorts to attach this course to a cohort (intake)."
                className="py-10"
            />
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-ink-400">
                Manage capacity, instructor and status for these offerings from each cohort&apos;s page.
            </p>
            <div className="overflow-hidden rounded-lg border border-surface-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-100 bg-surface-50">
                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Cohort</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Dates</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Status</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Seats</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {cohortCourses.map((cc) => {
                            const status = cohortCourseStatusDisplay(cc.status);
                            return (
                                <tr key={cc.id} className="hover:bg-surface-50">
                                    <td className="px-4 py-3">
                                        <Link to={`/admin/cohorts/${cc.cohort_id}`} className="font-medium text-ink-900 hover:text-blue-600">
                                            {cc.cohort_name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-ink-600">
                                        {cc.start_date && cc.end_date
                                            ? `${new Date(cc.start_date).toLocaleDateString()} – ${new Date(cc.end_date).toLocaleDateString()}`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                    </td>
                                    <td className="px-4 py-3 text-ink-600">
                                        {cc.seats_taken}/{cc.capacity ?? '∞'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
