import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BookOpen, ClipboardList, Settings2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { QuestionBankModal } from '@/features/assessment/QuestionBankPanel';
import { QuestionPicker } from '@/features/assessment/QuestionPicker';
import {
    useEvaluation,
    useEvaluationAttempts,
    useGradeAttempt,
    useUpdateEvaluation,
} from '@/features/assessment/useAssessment';
import type { EvaluationAttempt, Question } from '@/lib/api/types';

// ─── Tab types ─────────────────────────────────────────────────────────────────────────────

type Tab = 'settings' | 'questions' | 'attempts';

const TABS: { key: Tab; label: string; icon: typeof Settings2 }[] = [
    { key: 'settings', label: 'Settings', icon: Settings2 },
    { key: 'questions', label: 'Questions', icon: BookOpen },
    { key: 'attempts', label: 'Attempts', icon: ClipboardList },
];

// ─── Page ──────────────────────────────────────────────────────────────────────────────────

export function EvaluationEditPage() {
    const { id } = useParams();
    const evaluationId = Number(id);

    const { data: evaluation, isLoading: isLoadingEvaluation } = useEvaluation(evaluationId);
    const [activeTab, setActiveTab] = useState<Tab>('settings');

    if (isLoadingEvaluation || !evaluation) {
        return <Spinner />;
    }

    const courseId = evaluation.course_id;

    return (
        <div className="mx-auto max-w-3xl">
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
            </Link>

            <h1 className="mt-2 text-2xl">{evaluation.title}</h1>
            <p className="mt-1 text-sm text-ink-500">
                {evaluation.question_count ?? evaluation.questions?.length ?? 0} question
                {(evaluation.question_count ?? evaluation.questions?.length ?? 0) !== 1 ? 's' : ''}
                {' · '}Pass score: {evaluation.pass_score}%
            </p>

            {/* ─── Tab bar ───────────────────────────────────────────────────── */}
            <nav className="mt-6 flex gap-1 border-b border-surface-100" role="tablist">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === key}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                            'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition',
                            activeTab === key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-ink-500 hover:border-surface-200 hover:text-ink-700',
                        )}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </nav>

            {/* ─── Tab content ───────────────────────────────────────────────── */}
            <div className="mt-6">
                {activeTab === 'settings' && (
                    <SettingsTab evaluation={evaluation} courseId={courseId} />
                )}
                {activeTab === 'questions' && (
                    <QuestionsTab evaluation={evaluation} courseId={courseId} />
                )}
                {activeTab === 'attempts' && (
                    <AttemptsTab evaluation={evaluation} evaluationId={evaluationId} />
                )}
            </div>
        </div>
    );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────────────────

function SettingsTab({ evaluation, courseId }: { evaluation: import('@/lib/api/types').Evaluation; courseId: number }) {
    const updateEval = useUpdateEvaluation(courseId);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [title, setTitle] = useState(evaluation.title);
    const [description, setDescription] = useState(evaluation.description ?? '');
    const [instructions, setInstructions] = useState(evaluation.instructions ?? '');
    const [passScore, setPassScore] = useState(String(evaluation.pass_score));
    const [maxAttempts, setMaxAttempts] = useState(evaluation.max_attempts != null ? String(evaluation.max_attempts) : '');
    const [timeLimit, setTimeLimit] = useState(evaluation.time_limit_minutes != null ? String(evaluation.time_limit_minutes) : '');
    const [randomize, setRandomize] = useState(evaluation.randomize_questions);
    const [questionsPerAttempt, setQuestionsPerAttempt] = useState(
        evaluation.questions_per_attempt != null ? String(evaluation.questions_per_attempt) : '',
    );
    const [availableFrom, setAvailableFrom] = useState(
        evaluation.available_from ? evaluation.available_from.slice(0, 16) : '',
    );
    const [availableUntil, setAvailableUntil] = useState(
        evaluation.available_until ? evaluation.available_until.slice(0, 16) : '',
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        try {
            await updateEval.mutateAsync({
                evaluationId: evaluation.id,
                payload: {
                    title: title.trim(),
                    description: description.trim() || null,
                    instructions: instructions.trim() || null,
                    pass_score: Number(passScore),
                    max_attempts: maxAttempts ? Number(maxAttempts) : null,
                    time_limit_minutes: timeLimit ? Number(timeLimit) : null,
                    randomize_questions: randomize,
                    questions_per_attempt: questionsPerAttempt ? Number(questionsPerAttempt) : null,
                    available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
                    available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
                },
            });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not save settings.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <Alert variant="error" message={error} />}
            {success && <Alert variant="success" message="Settings saved." />}

            <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description shown to students before they start."
            />
            <Textarea
                label="Instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Guidelines shown on the pre-start screen (rules, materials allowed, grading notes…)."
            />

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Pass Score (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={passScore}
                    onChange={(e) => setPassScore(e.target.value)}
                    required
                />
                <Input
                    label="Max Attempts (blank = unlimited)"
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Time Limit (minutes, blank = none)"
                    type="number"
                    min={1}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                />
                <Input
                    label="Questions Per Attempt (blank = all)"
                    type="number"
                    min={1}
                    value={questionsPerAttempt}
                    onChange={(e) => setQuestionsPerAttempt(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Available From"
                    type="datetime-local"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                />
                <Input
                    label="Available Until"
                    type="datetime-local"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-900">
                <input
                    type="checkbox"
                    checked={randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                    className="size-4 accent-blue-600"
                />
                Randomize question order for each student
            </label>

            <div className="flex justify-end">
                <Button type="submit" isLoading={updateEval.isPending}>
                    Save Settings
                </Button>
            </div>
        </form>
    );
}

// ─── Questions Tab ─────────────────────────────────────────────────────────────────────────

function QuestionsTab({ evaluation, courseId }: { evaluation: import('@/lib/api/types').Evaluation; courseId: number }) {
    const updateEval = useUpdateEvaluation(courseId);
    const [error, setError] = useState<string | null>(null);
    const [showBankModal, setShowBankModal] = useState(false);

    const currentQuestionIds = (evaluation.questions ?? []).map((q) => q.id);

    const handleSaveQuestions = async (questionIds: number[]) => {
        setError(null);
        try {
            await updateEval.mutateAsync({
                evaluationId: evaluation.id,
                payload: { question_ids: questionIds },
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not update questions.');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {error && <Alert variant="error" message={error} />}

            <div className="flex items-center justify-between">
                <p className="text-sm text-ink-600">
                    Attach questions from your question banks to this evaluation.
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowBankModal(true)}>
                    Manage Banks
                </Button>
            </div>

            <QuestionPicker
                courseId={courseId}
                initialSelectedIds={currentQuestionIds}
                onSave={handleSaveQuestions}
                isSaving={updateEval.isPending}
            />

            <QuestionBankModal
                isOpen={showBankModal}
                onClose={() => setShowBankModal(false)}
                courseId={courseId}
            />
        </div>
    );
}

// ─── Attempts Tab (inline grading) ─────────────────────────────────────────────────────────

function AttemptsTab({ evaluation, evaluationId }: { evaluation: import('@/lib/api/types').Evaluation; evaluationId: number }) {
    const { data: attempts, isLoading } = useEvaluationAttempts(evaluationId);
    const [gradingId, setGradingId] = useState<number | null>(null);

    if (isLoading) return <Spinner />;

    const questionsById = new Map((evaluation.questions ?? []).map((q) => [q.id, q]));
    const needsGrading = (attempts ?? []).filter((a) => a.status === 'submitted');
    const graded = (attempts ?? []).filter((a) => a.status !== 'submitted');

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h2 className="text-lg font-medium">Needs grading</h2>
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
                        <EmptyState
                            icon={ClipboardList}
                            title="Nothing to grade"
                            description="No attempts are waiting on manual review."
                        />
                    )}
                </div>
            </section>

            {graded.length > 0 && (
                <section>
                    <h2 className="text-lg font-medium">Graded</h2>
                    <div className="mt-2 flex flex-col gap-2">
                        {graded.map((attempt) => (
                            <Card key={attempt.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{attempt.student?.name}</p>
                                    <p className="text-sm text-ink-600">Attempt #{attempt.attempt_number}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-ink-600">{attempt.score_percent}%</span>
                                    {attempt.passed && (
                                        <Badge label="Passed" tone="success" />
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ─── Manual Grade Form (extracted from EvaluationGradingPage) ──────────────────────────────

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
    const ungradedAnswers = attempt.answers.filter((a) => a.is_correct === null);
    const [points, setPoints] = useState<Record<number, string>>(
        Object.fromEntries(ungradedAnswers.map((a) => [a.id, a.points_awarded ?? ''])),
    );
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await grade.mutateAsync({
                attemptId: attempt.id,
                answerGrades: ungradedAnswers.map((a) => ({
                    answer_id: a.id,
                    points_awarded: Number(points[a.id] || 0),
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
