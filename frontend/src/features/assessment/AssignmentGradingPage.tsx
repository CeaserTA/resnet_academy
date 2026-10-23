import { useState } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useAssignment, useAssignmentSubmissions, useGradeSubmission } from '@/features/assessment/useAssessment';
import { useCourse } from '@/features/catalogue/useCourses';
import type { AssignmentRubric, AssignmentSubmission } from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatDate';

/** "18 / 20 (90%)" — the one way a mark is written on this page. */
function scoreLabel(score: number, max: number): string {
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    return `${Number(score.toFixed(2))} / ${max} (${pct}%)`;
}

function GradeForm({
    submission,
    rubrics,
    assignmentId,
    maxScore,
    onDone,
}: {
    submission: AssignmentSubmission;
    rubrics: AssignmentRubric[];
    assignmentId: number;
    maxScore: number;
    onDone: () => void;
}) {
    const grade = useGradeSubmission(assignmentId);
    const [rawScore, setRawScore] = useState(submission.raw_score ?? '');
    const [feedback, setFeedback] = useState(submission.feedback ?? '');
    const [rubricScores, setRubricScores] = useState<Record<number, string>>(
        Object.fromEntries(
            rubrics.map((rubric) => {
                const existing = submission.rubric_scores.find((score) => score.rubric_id === rubric.id);
                return [rubric.id, existing?.score ?? ''];
            }),
        ),
    );
    const [error, setError] = useState<string | null>(null);

    const raw = rawScore === '' ? null : Number(rawScore);
    const latePenalty = submission.is_late ? Number(submission.late_penalty_percent) : 0;
    const finalScore = raw === null ? null : raw * (1 - latePenalty / 100);
    const outOfRange = raw !== null && (raw < 0 || raw > maxScore);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (outOfRange) {
            setError(`Enter a score between 0 and ${maxScore}.`);
            return;
        }

        try {
            await grade.mutateAsync({
                submissionId: submission.id,
                raw_score: Number(rawScore),
                feedback: feedback || undefined,
                rubric_scores:
                    rubrics.length > 0
                        ? rubrics.map((rubric) => ({ rubric_id: rubric.id, score: Number(rubricScores[rubric.id] || 0) }))
                        : undefined,
            });
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save the grade.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 rounded-lg border border-surface-100 bg-surface-50 p-4">
            {error && <Alert variant="error" message={error} />}

            <div>
                <Input
                    label={`Score (out of ${maxScore})`}
                    type="number"
                    step="0.01"
                    min={0}
                    max={maxScore}
                    value={rawScore}
                    onChange={(e) => setRawScore(e.target.value)}
                    error={outOfRange ? `Must be between 0 and ${maxScore}` : undefined}
                    required
                />
                {raw !== null && !outOfRange && (
                    <p className="mt-1 text-xs text-ink-600">
                        {latePenalty > 0
                            ? `Late: −${latePenalty}% → student gets ${scoreLabel(finalScore!, maxScore)}`
                            : `Student gets ${scoreLabel(raw, maxScore)}`}
                    </p>
                )}
            </div>

            {rubrics.map((rubric) => (
                <Input
                    key={rubric.id}
                    label={`${rubric.criterion} (out of ${rubric.max_points})`}
                    type="number"
                    step="0.01"
                    min={0}
                    max={Number(rubric.max_points)}
                    value={rubricScores[rubric.id] ?? ''}
                    onChange={(e) => setRubricScores((prev) => ({ ...prev, [rubric.id]: e.target.value }))}
                />
            ))}

            <Textarea label="Feedback for the student" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />

            <div className="flex gap-2">
                <Button type="submit" isLoading={grade.isPending}>Save grade</Button>
                <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
            </div>
        </form>
    );
}

export function AssignmentGradingPage() {
    const { id } = useParams();
    const assignmentId = Number(id);

    const { data: assignment, isLoading: isLoadingAssignment } = useAssignment(assignmentId);
    const { data: submissions, isLoading: isLoadingSubmissions } = useAssignmentSubmissions(assignmentId, true);
    const { data: course } = useCourse(assignment?.course_id ?? Number.NaN);
    const [gradingId, setGradingId] = useState<number | null>(null);

    const all = submissions ?? [];
    const toGrade = all.filter((s) => s.status !== 'graded');
    const graded = all.filter((s) => s.status === 'graded');
    const maxScore = Number(assignment?.max_score ?? 0);

    const renderSubmission = (submission: AssignmentSubmission) => (
        <li key={submission.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">{submission.student?.name}</p>
                        {submission.status === 'graded' ? (
                            <Badge label="Graded" tone="success" icon={CheckCircle2} />
                        ) : (
                            <Badge label="Needs grading" tone="progress" />
                        )}
                        {submission.is_late && <Badge label="Late" tone="warning" icon={Clock} />}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-600">
                        Submitted {formatDateTime(submission.submitted_at)}
                        {submission.final_score !== null && ` · ${scoreLabel(Number(submission.final_score), maxScore)}`}
                    </p>
                    {submission.file_url && (
                        <a href={submission.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-600 hover:underline">
                            View submitted file
                        </a>
                    )}
                    {submission.text_content && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{submission.text_content}</p>}
                </div>
                {gradingId !== submission.id && (
                    <Button size="sm" variant={submission.status === 'graded' ? 'outline' : 'primary'} onClick={() => setGradingId(submission.id)}>
                        {submission.status === 'graded' ? 'Re-grade' : 'Grade'}
                    </Button>
                )}
            </div>

            {gradingId === submission.id && assignment && (
                <GradeForm
                    submission={submission}
                    rubrics={assignment.rubrics}
                    assignmentId={assignmentId}
                    maxScore={maxScore}
                    onDone={() => setGradingId(null)}
                />
            )}
        </li>
    );

    return (
        <PageFrame
            width="reading"
            title={assignment?.title ?? 'Assignment'}
            subtitle={assignment ? `Marked out of ${maxScore}` : undefined}
            breadcrumbs={[
                { label: 'Grading', to: '/grading' },
                ...(course ? [{ label: course.title, to: `/admin/courses/${course.id}/modules` }] : []),
                { label: assignment?.title ?? 'Assignment' },
            ]}
        >
            {isLoadingAssignment || isLoadingSubmissions || !assignment ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : all.length === 0 ? (
                <div className="rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <EmptyState icon={FileText} title="No submissions yet" description="Students haven't submitted this assignment." />
                </div>
            ) : (
                <>
                    <DashboardPanel title={`To grade (${toGrade.length})`}>
                        {toGrade.length === 0 ? (
                            <p className="px-4 py-5 text-center text-sm text-ink-600">Everything here is graded.</p>
                        ) : (
                            <ul className="divide-y divide-surface-100">{toGrade.map(renderSubmission)}</ul>
                        )}
                    </DashboardPanel>
                    {graded.length > 0 && (
                        <DashboardPanel title={`Graded (${graded.length})`}>
                            <ul className="divide-y divide-surface-100">{graded.map(renderSubmission)}</ul>
                        </DashboardPanel>
                    )}
                </>
            )}
        </PageFrame>
    );
}
