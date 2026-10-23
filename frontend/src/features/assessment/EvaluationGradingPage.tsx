import { useState } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, ClipboardList, RotateCcw, XCircle } from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useEvaluation, useEvaluationAttempts, useGradeAttempt, useGrantExtraAttempts } from '@/features/assessment/useAssessment';
import { useCourse } from '@/features/catalogue/useCourses';
import type { EvaluationAttempt, Question } from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatDate';

function ManualGradeForm({
    attempt,
    questionsById,
    evaluationId,
    passScore,
    onDone,
}: {
    attempt: EvaluationAttempt;
    questionsById: Map<number, Question>;
    evaluationId: number;
    passScore: number;
    onDone: () => void;
}) {
    const grade = useGradeAttempt(evaluationId);
    // Every manually-graded answer, not just the untouched ones: already-scored answers come
    // back pre-filled so a grader can revise them, and so an attempt whose answers were all
    // scored but never finalized can be re-submitted to finalize it. Auto-graded answers are
    // scored at submit time and are never a grader's concern.
    const manualAnswers = attempt.answers.filter((answer) => questionsById.get(answer.question_id)?.auto_gradable === false);
    const autoAnswers = attempt.answers.filter((answer) => questionsById.get(answer.question_id)?.auto_gradable !== false);
    const [points, setPoints] = useState<Record<number, string>>(
        Object.fromEntries(manualAnswers.map((answer) => [answer.id, answer.points_awarded ?? ''])),
    );
    const [error, setError] = useState<string | null>(null);

    // The whole-attempt picture as the grader types: auto-marked points + what they award.
    const maxOf = (questionId: number) => Number(questionsById.get(questionId)?.points ?? 0);
    const totalPossible = attempt.answers.reduce((sum, a) => sum + maxOf(a.question_id), 0);
    const autoPoints = autoAnswers.reduce((sum, a) => sum + Number(a.points_awarded ?? 0), 0);
    const manualPoints = manualAnswers.reduce((sum, a) => sum + Number(points[a.id] || 0), 0);
    const percent = totalPossible > 0 ? Math.round(((autoPoints + manualPoints) / totalPossible) * 100) : 0;
    const willPass = percent >= passScore;
    const overMax = manualAnswers.some((a) => Number(points[a.id] || 0) > maxOf(a.question_id) || Number(points[a.id] || 0) < 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (overMax) {
            setError('A mark is above the points available for its question.');
            return;
        }

        try {
            await grade.mutateAsync({
                attemptId: attempt.id,
                answerGrades: manualAnswers.map((answer) => ({ answer_id: answer.id, points_awarded: Number(points[answer.id] || 0) })),
            });
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save the grade.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4 rounded-lg border border-surface-100 bg-surface-50 p-4">
            {error && <Alert variant="error" message={error} />}

            {manualAnswers.map((answer) => {
                const question = questionsById.get(answer.question_id);
                const max = maxOf(answer.question_id);
                return (
                    <div key={answer.id} className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-ink-900">{question?.question_text}</p>
                        <p className="whitespace-pre-wrap rounded-md bg-surface-0 p-2 text-sm text-ink-600">{answer.answer_text || '(no answer given)'}</p>
                        <Input
                            label={`Points (out of ${max})`}
                            type="number"
                            step="0.5"
                            min={0}
                            max={max}
                            value={points[answer.id] ?? ''}
                            onChange={(e) => setPoints((prev) => ({ ...prev, [answer.id]: e.target.value }))}
                            required
                        />
                    </div>
                );
            })}

            <p className={`rounded-md px-3 py-2 text-sm ${willPass ? 'bg-success-600/10 text-success-600' : 'bg-amber-100 text-accent-amber'}`}>
                Total {Number((autoPoints + manualPoints).toFixed(2))} / {totalPossible} = <strong>{percent}%</strong> · pass mark {passScore}% →{' '}
                <strong>{willPass ? 'passes' : 'does not pass'}</strong>
                {autoAnswers.length > 0 && <span className="block text-xs text-ink-600">Includes {autoPoints} points from auto-marked questions.</span>}
            </p>

            <div className="flex gap-2">
                <Button type="submit" isLoading={grade.isPending}>Save grade</Button>
                <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
            </div>
        </form>
    );
}

/**
 * FR-12: the manual-grading queue for short-answer/essay questions — auto-gradable answers
 * never appear here, only attempts that still have at least one answer with is_correct=null.
 * Graded attempts list each student's latest result; a student who hasn't passed can be given
 * another attempt (BACKEND_CHANGES.md §3).
 */
export function EvaluationGradingPage() {
    const { id } = useParams();
    const evaluationId = Number(id);

    const { data: evaluation, isLoading: isLoadingEvaluation } = useEvaluation(evaluationId);
    const { data: attempts, isLoading: isLoadingAttempts } = useEvaluationAttempts(evaluationId);
    const { data: course } = useCourse(evaluation?.course_id ?? Number.NaN);
    const grantExtra = useGrantExtraAttempts(evaluationId);
    const [gradingId, setGradingId] = useState<number | null>(null);
    const [granted, setGranted] = useState<Set<number>>(new Set());

    const questionsById = new Map((evaluation?.questions ?? []).map((question) => [question.id, question]));
    const passScore = Number(evaluation?.pass_score ?? 0);
    const needsGrading = (attempts ?? []).filter((attempt) => attempt.status === 'submitted');

    // One row per student: their latest marked attempt, and whether any attempt passed.
    const byStudent = new Map<number, { latest: EvaluationAttempt; count: number; passed: boolean }>();
    (attempts ?? [])
        .filter((a) => a.status === 'graded' && a.student)
        .forEach((a) => {
            const prev = byStudent.get(a.student!.id);
            byStudent.set(a.student!.id, {
                latest: !prev || a.attempt_number > prev.latest.attempt_number ? a : prev.latest,
                count: (prev?.count ?? 0) + 1,
                passed: (prev?.passed ?? false) || a.passed === true,
            });
        });
    const results = [...byStudent.values()].sort((a, b) => Number(a.passed) - Number(b.passed));

    const handleGrant = async (studentId: number) => {
        await grantExtra.mutateAsync({ studentId, attempts: 1 });
        setGranted((prev) => new Set(prev).add(studentId));
    };

    return (
        <PageFrame
            width="reading"
            title={evaluation?.title ?? 'Quiz'}
            subtitle={evaluation ? `Pass mark ${passScore}%${evaluation.max_attempts ? ` · ${evaluation.max_attempts} attempts` : ''}` : undefined}
            breadcrumbs={[
                { label: 'Grading', to: '/grading' },
                ...(course ? [{ label: course.title, to: `/admin/courses/${course.id}/modules` }] : []),
                { label: evaluation?.title ?? 'Quiz' },
            ]}
        >
            {isLoadingEvaluation || isLoadingAttempts || !evaluation ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
                <>
                    <DashboardPanel title={`To grade (${needsGrading.length})`}>
                        {needsGrading.length === 0 ? (
                            <EmptyState icon={ClipboardList} title="Nothing to grade" description="No attempts are waiting for written answers to be marked." />
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {needsGrading.map((attempt) => (
                                    <li key={attempt.id} className="px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-ink-900">{attempt.student?.name}</p>
                                                <p className="text-xs text-ink-600">
                                                    Attempt {attempt.attempt_number} · submitted {attempt.submitted_at && formatDateTime(attempt.submitted_at)}
                                                </p>
                                            </div>
                                            {gradingId !== attempt.id && (
                                                <Button size="sm" onClick={() => setGradingId(attempt.id)}>Grade</Button>
                                            )}
                                        </div>
                                        {gradingId === attempt.id && (
                                            <ManualGradeForm
                                                attempt={attempt}
                                                questionsById={questionsById}
                                                evaluationId={evaluationId}
                                                passScore={passScore}
                                                onDone={() => setGradingId(null)}
                                            />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashboardPanel>

                    {results.length > 0 && (
                        <DashboardPanel title={`Results (${results.length} student${results.length === 1 ? '' : 's'})`}>
                            <ul className="divide-y divide-surface-100">
                                {results.map(({ latest, count, passed }) => {
                                    const student = latest.student!;
                                    return (
                                        <li key={student.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-ink-900">{student.name}</p>
                                                <p className="text-xs text-ink-600">
                                                    Latest {latest.score_percent}% · {count} attempt{count === 1 ? '' : 's'} used
                                                </p>
                                            </div>
                                            {passed ? (
                                                <Badge label="Passed" tone="success" icon={CheckCircle2} />
                                            ) : (
                                                <>
                                                    <Badge label="Not passed" tone="danger" icon={XCircle} />
                                                    {granted.has(student.id) ? (
                                                        <span className="text-xs font-medium text-success-600">Extra attempt given</span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleGrant(student.id)}
                                                            isLoading={grantExtra.isPending && grantExtra.variables?.studentId === student.id}
                                                        >
                                                            <RotateCcw className="size-3.5" aria-hidden="true" />
                                                            Give another attempt
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </DashboardPanel>
                    )}
                </>
            )}
        </PageFrame>
    );
}
