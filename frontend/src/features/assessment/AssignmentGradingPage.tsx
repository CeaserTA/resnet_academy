import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useAssignment, useAssignmentSubmissions, useGradeSubmission } from '@/features/assessment/useAssessment';
import type { AssignmentRubric, AssignmentSubmission } from '@/lib/api/types';

function GradeForm({
    submission,
    rubrics,
    assignmentId,
    onDone,
}: {
    submission: AssignmentSubmission;
    rubrics: AssignmentRubric[];
    assignmentId: number;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

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
        <form
            onSubmit={handleSubmit}
            className="mt-3 flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}

            <Input
                label="Raw score"
                type="number"
                step="0.01"
                value={rawScore}
                onChange={(e) => setRawScore(e.target.value)}
                required
            />

            {rubrics.map((rubric) => (
                <Input
                    key={rubric.id}
                    label={`${rubric.criterion} (max ${rubric.max_points})`}
                    type="number"
                    step="0.01"
                    value={rubricScores[rubric.id] ?? ''}
                    onChange={(e) => setRubricScores((prev) => ({ ...prev, [rubric.id]: e.target.value }))}
                />
            ))}

            <Textarea label="Feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />

            <div className="flex gap-2">
                <Button type="submit" isLoading={grade.isPending}>
                    Save grade
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export function AssignmentGradingPage() {
    const { id } = useParams();
    const assignmentId = Number(id);

    const { data: assignment, isLoading: isLoadingAssignment } = useAssignment(assignmentId);
    const { data: submissions, isLoading: isLoadingSubmissions } = useAssignmentSubmissions(assignmentId, true);
    const [gradingId, setGradingId] = useState<number | null>(null);

    if (isLoadingAssignment || isLoadingSubmissions || !assignment) {
        return <Spinner />;
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
            </Link>

            <h1 className="mt-2 text-2xl">{assignment.title} — submissions</h1>
            <p className="mt-1 text-sm text-ink-600">Max score {assignment.max_score}</p>

            <div className="mt-6 flex flex-col gap-3">
                {(submissions ?? []).map((submission) => (
                    <Card key={submission.id}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-medium">{submission.student?.name}</h3>
                                    {submission.status === 'graded' ? (
                                        <Badge label="Graded" tone="success" icon={CheckCircle2} />
                                    ) : (
                                        <Badge label="Needs grading" tone="progress" />
                                    )}
                                    {submission.is_late && <Badge label="Late" tone="warning" icon={Clock} />}
                                </div>
                                <p className="mt-1 text-sm text-ink-600">
                                    Submitted {new Date(submission.submitted_at).toLocaleString()}
                                    {submission.final_score !== null && ` — Score: ${submission.final_score}`}
                                </p>
                                {submission.file_url && (
                                    <a
                                        href={submission.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                                    >
                                        View submitted file
                                    </a>
                                )}
                                {submission.text_content && (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">
                                        {submission.text_content}
                                    </p>
                                )}
                            </div>
                            {gradingId !== submission.id && (
                                <Button variant="secondary" onClick={() => setGradingId(submission.id)}>
                                    {submission.status === 'graded' ? 'Re-grade' : 'Grade'}
                                </Button>
                            )}
                        </div>

                        {gradingId === submission.id && (
                            <GradeForm
                                submission={submission}
                                rubrics={assignment.rubrics}
                                assignmentId={assignmentId}
                                onDone={() => setGradingId(null)}
                            />
                        )}
                    </Card>
                ))}

                {(submissions ?? []).length === 0 && (
                    <EmptyState
                        icon={FileText}
                        title="No submissions yet"
                        description="Students haven't submitted this assignment."
                    />
                )}
            </div>
        </div>
    );
}
