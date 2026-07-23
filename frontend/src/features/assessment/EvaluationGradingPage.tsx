import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useEvaluation, useEvaluationAttempts, useGradeAttempt } from '@/features/assessment/useAssessment';
import type { EvaluationAttempt, Question } from '@/lib/api/types';

function ManualGradeForm({
    attempt,
    questionsById,
    evaluationId,
    onDone,
}: {
    attempt: EvaluationAttempt;
    questionsById: Map<number, Question>;
    evaluationId: number;
    onDone: () => void;
}) {
    const grade = useGradeAttempt(evaluationId);
    const ungradedAnswers = attempt.answers.filter((answer) => answer.is_correct === null);
    const [points, setPoints] = useState<Record<number, string>>(
        Object.fromEntries(ungradedAnswers.map((answer) => [answer.id, answer.points_awarded ?? ''])),
    );
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await grade.mutateAsync({
                attemptId: attempt.id,
                answerGrades: ungradedAnswers.map((answer) => ({
                    answer_id: answer.id,
                    points_awarded: Number(points[answer.id] || 0),
                })),
            });
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save the grade.');
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-3 flex flex-col gap-4 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}

            {ungradedAnswers.map((answer) => {
                const question = questionsById.get(answer.question_id);

                return (
                    <div key={answer.id} className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-ink-900">{question?.question_text}</p>
                        <p className="whitespace-pre-wrap rounded-md bg-surface-0 p-2 text-sm text-ink-600">
                            {answer.answer_text || '(no answer given)'}
                        </p>
                        <Input
                            label={`Points awarded (max ${question?.points ?? '?'})`}
                            type="number"
                            step="0.01"
                            value={points[answer.id] ?? ''}
                            onChange={(e) => setPoints((prev) => ({ ...prev, [answer.id]: e.target.value }))}
                            required
                        />
                    </div>
                );
            })}

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

/**
 * FR-12: the manual-grading queue for short-answer/essay questions — auto-gradable answers
 * never appear here, only attempts that still have at least one answer with is_correct=null.
 */
export function EvaluationGradingPage() {
    const { id } = useParams();
    const evaluationId = Number(id);

    const { data: evaluation, isLoading: isLoadingEvaluation } = useEvaluation(evaluationId);
    const { data: attempts, isLoading: isLoadingAttempts } = useEvaluationAttempts(evaluationId);
    const [gradingId, setGradingId] = useState<number | null>(null);

    if (isLoadingEvaluation || isLoadingAttempts || !evaluation) {
        return <Spinner />;
    }

    const questionsById = new Map((evaluation.questions ?? []).map((question) => [question.id, question]));
    const needsGrading = (attempts ?? []).filter((attempt) => attempt.status === 'submitted');
    const graded = (attempts ?? []).filter((attempt) => attempt.status !== 'submitted');

    return (
        <div className="mx-auto max-w-3xl">
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
            </Link>

            <h1 className="mt-2 text-2xl">{evaluation.title} — attempts</h1>

            <h2 className="mt-6 text-lg font-medium">Needs grading</h2>
            <div className="mt-2 flex flex-col gap-3">
                {needsGrading.map((attempt) => (
                    <Card key={attempt.id}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{attempt.student?.name}</p>
                                <p className="text-sm text-ink-600">
                                    Attempt #{attempt.attempt_number} — submitted{' '}
                                    {attempt.submitted_at && new Date(attempt.submitted_at).toLocaleString()}
                                </p>
                            </div>
                            {gradingId !== attempt.id && (
                                <Button variant="secondary" onClick={() => setGradingId(attempt.id)}>
                                    Grade
                                </Button>
                            )}
                        </div>

                        {gradingId === attempt.id && (
                            <ManualGradeForm
                                attempt={attempt}
                                questionsById={questionsById}
                                evaluationId={evaluationId}
                                onDone={() => setGradingId(null)}
                            />
                        )}
                    </Card>
                ))}

                {needsGrading.length === 0 && (
                    <EmptyState icon={ClipboardList} title="Nothing to grade" description="No attempts are waiting on manual review." />
                )}
            </div>

            <h2 className="mt-8 text-lg font-medium">Graded</h2>
            <div className="mt-2 flex flex-col gap-2">
                {graded.map((attempt) => (
                    <Card key={attempt.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{attempt.student?.name}</p>
                            <p className="text-sm text-ink-600">Attempt #{attempt.attempt_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-ink-600">{attempt.score_percent}%</span>
                            {attempt.passed && <Badge label="Passed" tone="success" icon={CheckCircle2} />}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
