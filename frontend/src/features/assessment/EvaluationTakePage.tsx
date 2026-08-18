import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useCourse } from '@/features/catalogue/useCourses';
import { ApiError } from '@/lib/api/client';
import { useStartAttempt, useSubmitAttempt } from '@/features/assessment/useAssessment';
import type { AttemptAnswerInput } from '@/features/assessment/api';
import type { AttemptQuestion, EvaluationAttempt, StartAttemptResponse } from '@/lib/api/types';

type AnswerState = Record<number, { selectedOptionIds: number[]; answerText: string }>;

function emptyAnswers(questions: AttemptQuestion[]): AnswerState {
    return Object.fromEntries(questions.map((q) => [q.id, { selectedOptionIds: [], answerText: '' }]));
}

function QuestionCard({
    question,
    index,
    answer,
    onChange,
}: {
    question: AttemptQuestion;
    index: number;
    answer: { selectedOptionIds: number[]; answerText: string };
    onChange: (next: { selectedOptionIds: number[]; answerText: string }) => void;
}) {
    const isMulti = question.type === 'mcq_multi';
    const isChoice = question.type === 'mcq_single' || question.type === 'mcq_multi' || question.type === 'true_false';

    const toggleOption = (optionId: number) => {
        if (isMulti) {
            const next = answer.selectedOptionIds.includes(optionId)
                ? answer.selectedOptionIds.filter((id) => id !== optionId)
                : [...answer.selectedOptionIds, optionId];
            onChange({ ...answer, selectedOptionIds: next });
        } else {
            onChange({ ...answer, selectedOptionIds: [optionId] });
        }
    };

    return (
        <Card>
            <p className="font-medium text-ink-900">
                <span>{`${index + 1}. ${question.question_text}`}</span>
                <span className="ml-2 text-xs text-ink-600">({question.points} pts)</span>
            </p>

            {isChoice && (
                <div className="mt-3 flex flex-col gap-2">
                    {question.options.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 text-sm text-ink-900">
                            <input
                                type={isMulti ? 'checkbox' : 'radio'}
                                name={`question-${question.id}`}
                                checked={answer.selectedOptionIds.includes(option.id)}
                                onChange={() => toggleOption(option.id)}
                            />
                            {option.option_text}
                        </label>
                    ))}
                </div>
            )}

            {!isChoice && (
                <Textarea
                    label="Your answer"
                    rows={4}
                    value={answer.answerText}
                    onChange={(e) => onChange({ ...answer, answerText: e.target.value })}
                    className="mt-3"
                />
            )}
        </Card>
    );
}

function CountdownBadge({ deadline, onExpire }: { deadline: Date; onExpire: () => void }) {
    const [remainingMs, setRemainingMs] = useState<number | null>(null);
    const hasExpired = useRef(false);

    useEffect(() => {
        hasExpired.current = false;

        const tick = () => {
            const next = deadline.getTime() - Date.now();
            setRemainingMs(next);

            if (next <= 0 && !hasExpired.current) {
                hasExpired.current = true;
                onExpire();
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // onExpire is re-created each render; only the deadline should reset this timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadline]);

    if (remainingMs === null) {
        return null;
    }

    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
        <Badge
            label={`${minutes}:${seconds.toString().padStart(2, '0')} remaining`}
            tone={remainingMs < 60_000 ? 'danger' : 'progress'}
            icon={Clock}
        />
    );
}

function AttemptResult({ attempt }: { attempt: EvaluationAttempt }) {
    if (attempt.status === 'submitted') {
        return (
            <Alert
                variant="success"
                message="Submitted. Some answers need your instructor's review before a final score appears here."
            />
        );
    }

    return (
        <Card className="flex items-center justify-between">
            <div>
                <p className="text-lg font-medium">Score: {attempt.score_percent}%</p>
                <p className="text-sm text-ink-600">Attempt #{attempt.attempt_number}</p>
            </div>
            {attempt.passed ? (
                <Badge label="Passed" tone="success" icon={CheckCircle2} />
            ) : (
                <Badge label="Not passed" tone="danger" icon={XCircle} />
            )}
        </Card>
    );
}

/**
 * FR-12: start/resume an attempt, answer questions (never shown an answer key —
 * AttemptQuestion has no is_correct), submit within the time limit if one applies. Auto-grades
 * objective questions server-side; mixed attempts with essay/short-answer land in "submitted"
 * until an instructor grades them (EvaluationGradingPage).
 */
export function EvaluationTakePage() {
    const { id } = useParams();
    const evaluationId = Number(id);
    const [searchParams] = useSearchParams();
    const courseId = Number(searchParams.get('course'));

    const { data: course } = useCourse(courseId);
    const startAttempt = useStartAttempt();
    const submitAttempt = useSubmitAttempt();

    const [session, setSession] = useState<StartAttemptResponse | null>(null);
    const [answers, setAnswers] = useState<AnswerState>({});
    const [result, setResult] = useState<EvaluationAttempt | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(evaluationId)) {
            return;
        }

        startAttempt.mutate(evaluationId, {
            onSuccess: (data) => {
                setSession(data);
                setAnswers(emptyAnswers(data.questions));
            },
            onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not start this evaluation.'),
        });
        // Only ever start once per mount — re-running on every render would open duplicate attempts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evaluationId]);

    const deadline = useMemo(() => {
        if (!session || session.evaluation.time_limit_minutes === null) {
            return null;
        }
        const startedAt = new Date(session.attempt.started_at);
        return new Date(startedAt.getTime() + session.evaluation.time_limit_minutes * 60_000);
    }, [session]);

    const handleSubmit = async () => {
        if (!session) {
            return;
        }
        setError(null);

        const payload: AttemptAnswerInput[] = session.questions.map((question) => {
            const answer = answers[question.id];
            const isChoice = question.type === 'mcq_single' || question.type === 'mcq_multi' || question.type === 'true_false';

            return {
                question_id: question.id,
                selected_option_ids: isChoice ? answer.selectedOptionIds : undefined,
                answer_text: isChoice ? undefined : answer.answerText,
            };
        });

        try {
            const attempt = await submitAttempt.mutateAsync({ attemptId: session.attempt.id, answers: payload });
            setResult(attempt);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit this attempt.');
        }
    };

    if (startAttempt.isPending || !session) {
        return error ? <Alert variant="error" message={error} /> : <Spinner />;
    }

    // Evaluation has no questions yet — guard before the student can submit an empty attempt
    if (session.questions.length === 0) {
        return (
            <div className="mx-auto max-w-2xl py-12">
                <Alert
                    variant="error"
                    message="This evaluation has no questions yet. Your instructor hasn't added any questions to it — check back later or contact support."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl">
            <Breadcrumbs
                items={[
                    { label: 'My Courses', to: '/dashboard' },
                    { label: course?.title ?? '', to: `/learn/courses/${courseId}` },
                    { label: `Attempt #${session.attempt.attempt_number}` },
                ]}
            />

            <div className="mt-2 flex items-center justify-between">
                <h1 className="text-2xl">Attempt #{session.attempt.attempt_number}</h1>
                {deadline && !result && <CountdownBadge deadline={deadline} onExpire={handleSubmit} />}
            </div>

            {result ? (
                <div className="mt-6">
                    <AttemptResult attempt={result} />
                </div>
            ) : (
                <div className="mt-6 flex flex-col gap-4">
                    {error && <Alert variant="error" message={error} />}

                    {session.questions.map((question, index) => (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            index={index}
                            answer={answers[question.id] ?? { selectedOptionIds: [], answerText: '' }}
                            onChange={(next) => setAnswers((prev) => ({ ...prev, [question.id]: next }))}
                        />
                    ))}

                    <Button onClick={handleSubmit} isLoading={submitAttempt.isPending} className="self-start">
                        Submit attempt
                    </Button>
                </div>
            )}
        </div>
    );
}
