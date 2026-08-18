import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Award, CheckCircle2, Clock, Eye, Hash, ListChecks, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useCourse } from '@/features/catalogue/useCourses';
import { ApiError } from '@/lib/api/client';
import {
    useEvaluationOverview,
    useMyEvaluationAttempts,
    useStartAttempt,
    useSubmitAttempt,
} from '@/features/assessment/useAssessment';
import { AttemptReviewModal } from '@/features/assessment/AttemptReviewModal';
import type { AttemptAnswerInput } from '@/features/assessment/api';
import type {
    AttemptQuestion,
    EvaluationAttempt,
    EvaluationOverview,
    StartAttemptResponse,
} from '@/lib/api/types';

type AnswerState = Record<number, { selectedOptionIds: number[]; answerText: string }>;

function emptyAnswers(questions: AttemptQuestion[]): AnswerState {
    return Object.fromEntries(questions.map((q) => [q.id, { selectedOptionIds: [], answerText: '' }]));
}

/** Blocks copy/cut/paste, selection and the right-click menu over live question content. */
function antiCheatHandlers() {
    const block = (e: { preventDefault: () => void }) => e.preventDefault();
    return {
        onCopy: block,
        onCut: block,
        onPaste: block,
        onContextMenu: block,
    };
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
            {/* Anti-cheating: question text + options are unselectable and block clipboard/context menu. */}
            <div className="select-none" {...antiCheatHandlers()}>
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
            </div>

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
    const [showReview, setShowReview] = useState(false);

    const reviewButton = (
        <Button variant="outline" onClick={() => setShowReview(true)} className="mt-3">
            <Eye className="size-4" />
            Review answers
        </Button>
    );

    if (attempt.status === 'submitted') {
        return (
            <>
                <Alert
                    variant="success"
                    message="Submitted. Some answers need your instructor's review before a final score appears here."
                />
                {reviewButton}
                <AttemptReviewModal
                    isOpen={showReview}
                    onClose={() => setShowReview(false)}
                    attemptId={attempt.id}
                    attemptNumber={attempt.attempt_number}
                />
            </>
        );
    }

    return (
        <>
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
            {reviewButton}
            <AttemptReviewModal
                isOpen={showReview}
                onClose={() => setShowReview(false)}
                attemptId={attempt.id}
                attemptNumber={attempt.attempt_number}
            />
        </>
    );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-surface-100 bg-surface-50 px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
            <div>
                <p className="text-xs text-ink-500">{label}</p>
                <p className="text-sm font-medium text-ink-900">{value}</p>
            </div>
        </div>
    );
}

/**
 * Pre-start screen: instructor instructions, limits, attempts used/remaining, question and
 * point totals, the persistent past-attempts history, and the confirmed start action.
 */
function InstructionScreen({
    overview,
    attempts,
    onStart,
    isStarting,
    error,
}: {
    overview: EvaluationOverview;
    attempts: EvaluationAttempt[];
    onStart: () => void;
    isStarting: boolean;
    error: string | null;
}) {
    const [reviewAttempt, setReviewAttempt] = useState<EvaluationAttempt | null>(null);

    const completedAttempts = attempts.filter((a) => a.status === 'submitted' || a.status === 'graded');
    // Passing completes the evaluation for the student — after that there is nothing left
    // to start, only past attempts to review.
    const alreadyCompleted = attempts.some((a) => a.passed === true);
    const hasInProgress = overview.in_progress_attempt !== null;
    const attemptsExhausted = overview.attempts_remaining === 0;
    const canStart = !alreadyCompleted && !attemptsExhausted && overview.question_count > 0;

    const handleStartClick = () => {
        // Resuming an already-running attempt needs no confirmation — its timer started earlier.
        if (hasInProgress) {
            onStart();
            return;
        }

        const confirmed = window.confirm(
            'Are you sure you want to start? Your attempt and timer will begin immediately.',
        );
        if (confirmed) {
            onStart();
        }
    };

    const attemptsLabel =
        overview.max_attempts === null
            ? `${overview.attempts_used} used · unlimited attempts`
            : `${overview.attempts_used} of ${overview.max_attempts} used`;

    return (
        <div className="flex flex-col gap-5">
            {error && <Alert variant="error" message={error} />}

            <Card>
                <h2 className="text-lg font-medium">Instructions</h2>

                {overview.description && (
                    <p className="mt-2 text-sm text-ink-600">{overview.description}</p>
                )}

                {overview.instructions ? (
                    <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-50 p-3 text-sm text-ink-900">
                        {overview.instructions}
                    </p>
                ) : (
                    <p className="mt-3 text-sm text-ink-500">No additional instructions for this evaluation.</p>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <StatTile
                        icon={Clock}
                        label="Time limit"
                        value={overview.time_limit_minutes !== null ? `${overview.time_limit_minutes} minutes` : 'No time limit'}
                    />
                    <StatTile icon={ListChecks} label="Attempts" value={attemptsLabel} />
                    <StatTile icon={Hash} label="Questions" value={String(overview.question_count)} />
                    <StatTile icon={Award} label="Total points" value={String(overview.total_points)} />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    {alreadyCompleted ? (
                        <p className="rounded-md bg-success-600/10 px-3 py-2 text-sm text-success-600">
                            You have already completed this evaluation. Your results are listed below.
                        </p>
                    ) : (
                        <>
                            {attemptsExhausted && (
                                <Alert variant="error" message="You have used all of your attempts for this evaluation." />
                            )}
                            {!attemptsExhausted && overview.question_count === 0 && (
                                <Alert variant="error" message="This evaluation has no questions yet. Check back later." />
                            )}
                            <Button onClick={handleStartClick} isLoading={isStarting} disabled={!canStart} className="self-start">
                                {hasInProgress ? 'Resume attempt' : 'Start Evaluation'}
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {completedAttempts.length > 0 && (
                <section>
                    <h2 className="text-lg font-medium">Past Attempts</h2>
                    <div className="mt-2 flex flex-col gap-2">
                        {completedAttempts.map((attempt) => (
                            <Card key={attempt.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Attempt #{attempt.attempt_number}</p>
                                    <p className="text-sm text-ink-600">
                                        {attempt.score_percent !== null ? `Score: ${attempt.score_percent}%` : 'Awaiting grading'}
                                        {attempt.submitted_at && ` · Submitted on ${new Date(attempt.submitted_at).toLocaleString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {attempt.passed !== null && (
                                        <Badge
                                            label={attempt.passed ? 'Passed' : 'Not passed'}
                                            tone={attempt.passed ? 'success' : 'danger'}
                                        />
                                    )}
                                    <Button variant="outline" onClick={() => setReviewAttempt(attempt)}>
                                        <Eye className="size-4" />
                                        Review Results
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {reviewAttempt !== null && (
                <AttemptReviewModal
                    isOpen
                    onClose={() => setReviewAttempt(null)}
                    attemptId={reviewAttempt.id}
                    attemptNumber={reviewAttempt.attempt_number}
                />
            )}
        </div>
    );
}

/**
 * FR-12: instructions + confirmed start, answer questions (never shown an answer key —
 * AttemptQuestion has no is_correct), submit within the time limit if one applies. Auto-grades
 * objective questions server-side; mixed attempts with essay/short-answer land in "submitted"
 * until an instructor grades them (EvaluationGradingPage). Past attempts stay reviewable here.
 */
export function EvaluationTakePage() {
    const { id } = useParams();
    const evaluationId = Number(id);
    const [searchParams] = useSearchParams();
    const courseId = Number(searchParams.get('course'));

    const { data: course } = useCourse(courseId);
    const { data: overview, isLoading: isLoadingOverview, error: overviewError } = useEvaluationOverview(evaluationId);
    const { data: myAttempts } = useMyEvaluationAttempts(evaluationId);
    const startAttempt = useStartAttempt();
    const submitAttempt = useSubmitAttempt();

    const [session, setSession] = useState<StartAttemptResponse | null>(null);
    const [answers, setAnswers] = useState<AnswerState>({});
    const [result, setResult] = useState<EvaluationAttempt | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStart = () => {
        setError(null);
        startAttempt.mutate(evaluationId, {
            onSuccess: (data) => {
                setSession(data);
                setAnswers(emptyAnswers(data.questions));
            },
            onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not start this evaluation.'),
        });
    };

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

    // Pre-start phase: overview (and history) must load before the instructions screen renders.
    if (!session) {
        if (isLoadingOverview) {
            return <Spinner />;
        }

        if (overviewError || !overview) {
            return (
                <Alert
                    variant="error"
                    message={overviewError instanceof ApiError ? overviewError.message : 'Could not load this evaluation.'}
                />
            );
        }

        return (
            <div className="mx-auto max-w-2xl">
                <Breadcrumbs
                    items={[
                        { label: 'My Courses', to: '/dashboard' },
                        { label: course?.title ?? '', to: `/learn/courses/${courseId}` },
                        { label: overview.title },
                    ]}
                />
                <h1 className="mt-2 text-2xl">{overview.title}</h1>
                <div className="mt-6">
                    <InstructionScreen
                        overview={overview}
                        attempts={myAttempts ?? []}
                        onStart={handleStart}
                        isStarting={startAttempt.isPending}
                        error={error}
                    />
                </div>
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
