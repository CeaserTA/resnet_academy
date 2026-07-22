import { useParams } from 'react-router';
import { ClipboardList } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGradebook } from '@/features/assessment/useAssessment';
import { useCourse } from '@/features/catalogue/useCourses';

/**
 * Business rule "Gradebook": one row per student, one column per assignment/evaluation, plus
 * a computed final grade — ui-context.md §6's table styling (zebra striping, sticky header,
 * right-aligned mono numerics).
 */
export function GradebookPage() {
    const { id } = useParams();
    const courseId = Number(id);

    const { data: course } = useCourse(courseId);
    const { data: gradebook, isLoading } = useGradebook(courseId);

    if (isLoading || !gradebook) {
        return <Spinner />;
    }

    if (gradebook.students.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="No confirmed students yet"
                description="The gradebook fills in once students are enrolled and confirmed."
            />
        );
    }

    return (
        <div>
            <h1 className="text-2xl">{course?.title} — gradebook</h1>

            <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface-100 text-left">
                        <tr>
                            <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                            {gradebook.assignments.map((assignment) => (
                                <th key={`a-${assignment.id}`} className="px-4 py-2 text-right font-medium text-ink-600">
                                    {assignment.title}
                                    <span className="block text-xs font-normal text-ink-300">/{assignment.max_score}</span>
                                </th>
                            ))}
                            {gradebook.evaluations.map((evaluation) => (
                                <th key={`e-${evaluation.id}`} className="px-4 py-2 text-right font-medium text-ink-600">
                                    {evaluation.title}
                                    <span className="block text-xs font-normal text-ink-300">/100</span>
                                </th>
                            ))}
                            <th className="px-4 py-2 text-right font-medium text-ink-600">Final grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gradebook.students.map((row, index) => (
                            <tr key={row.student.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                <td className="px-4 py-3 font-medium text-ink-900">{row.student.name}</td>
                                {row.assignment_scores.map((score) => (
                                    <td key={score.assignment_id} className="px-4 py-3 text-right font-mono">
                                        {score.final_score ?? '—'}
                                    </td>
                                ))}
                                {row.evaluation_scores.map((score) => (
                                    <td key={score.evaluation_id} className="px-4 py-3 text-right font-mono">
                                        {score.best_score_percent ?? '—'}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-right font-mono font-medium text-ink-900">
                                    {row.final_grade_percent ?? '—'}
                                    {row.final_grade_percent !== null && '%'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
