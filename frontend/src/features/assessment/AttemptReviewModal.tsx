import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useAttemptReview } from '@/features/assessment/useAssessment';
import type { AttemptReviewOption, AttemptReviewQuestion } from '@/lib/api/types';

interface AttemptReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    attemptId: number;
    attemptNumber: number;
}

type QuestionStatus = 'correct' | 'incorrect' | 'partial' | 'pending';

/**
 * Derives the display status from the graded answer. Partial credit only applies to
 * multi-choice: every selected option is a correct one, but the selection wasn't the
 * exact set the key requires (grading itself stays all-or-nothing server-side).
 */
function questionStatus(question: AttemptReviewQuestion): QuestionStatus {
    if (question.is_correct === true) return 'correct';
    if (question.is_correct === null) return 'pending';

    if (question.type === 'mcq_multi' && question.options.length > 0) {
        const selected = question.options.filter((o) => o.selected);
        if (selected.length > 0 && selected.every((o) => o.is_correct)) return 'partial';
    }

    return 'incorrect';
}

const STATUS_BADGES: Record<QuestionStatus, { label: string; tone: BadgeTone }> = {
    correct: { label: 'Correct', tone: 'success' },
    incorrect: { label: 'Incorrect', tone: 'danger' },
    partial: { label: 'Partially Correct', tone: 'warning' },
    pending: { label: 'Awaiting Grading', tone: 'neutral' },
};

function formatDuration(totalSeconds: number | null): string {
    if (totalSeconds === null) return '—';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Read-only option row — a <div>, never an <input>, so nothing here is interactive. */
function OptionRow({ option }: { option: AttemptReviewOption }) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                option.is_correct
                    ? 'border-success-600/40 bg-success-600/10'
                    : option.selected
                      ? 'border-danger-600/40 bg-danger-600/10'
                      : 'border-surface-100 bg-surface-0',
            )}
        >
            {option.is_correct ? (
                <CheckCircle2 className="size-4 shrink-0 text-success-600" aria-hidden="true" />
            ) : option.selected ? (
                <XCircle className="size-4 shrink-0 text-danger-600" aria-hidden="true" />
            ) : (
                <span className="size-4 shrink-0 rounded-full border border-ink-300" aria-hidden="true" />
            )}
            <span className="flex-1 text-ink-900">{option.option_text}</span>
            {option.selected && (
                <Badge label="Your answer" tone={option.is_correct ? 'success' : 'danger'} />
            )}
            {option.is_correct && <Badge label="Correct answer" tone="success" />}
        </div>
    );
}

function ReviewQuestionCard({ question, index }: { question: AttemptReviewQuestion; index: number }) {
    const status = questionStatus(question);
    const badge = STATUS_BADGES[status];
    const isChoice = question.options.length > 0;

    return (
        <div className="rounded-xl border border-surface-100 bg-surface-0 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink-900">
                    {index + 1}. {question.question_text}
                </p>
                <Badge label={badge.label} tone={badge.tone} />
            </div>

            <p className="mt-1 text-xs text-ink-600">
                {question.points_awarded ?? '—'} / {question.points} pt{Number(question.points) !== 1 ? 's' : ''}
            </p>

            {isChoice && (
                <div className="mt-3 flex flex-col gap-2">
                    {question.options.map((option) => (
                        <OptionRow key={option.id} option={option} />
                    ))}
                </div>
            )}

            {!isChoice && (
                <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink-600">Your answer</span>
                    <p className="rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-sm whitespace-pre-wrap text-ink-900">
                        {question.answer_text?.trim() ? question.answer_text : 'No answer submitted'}
                    </p>
                    {status === 'pending' && (
                        <p className="text-xs text-ink-500">
                            This answer type is graded manually — the final score appears once your instructor reviews it.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Strictly read-only result breakdown for a completed attempt. No form inputs, state
 * handlers, or submit actions — the API endpoint itself also rejects any mutation of a
 * submitted attempt, so this view cannot modify answers even by accident.
 */
export function AttemptReviewModal({ isOpen, onClose, attemptId, attemptNumber }: AttemptReviewModalProps) {
    // Only fetch while open — the answer key should never sit in the query cache pre-submission.
    const review = useAttemptReview(isOpen ? attemptId : null);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Attempt #${attemptNumber} — Results`}
            className="max-h-[85vh] max-w-2xl"
            footer={
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            }
        >
            {review.isLoading && (
                <div className="flex items-center justify-center py-16">
                    <Spinner />
                </div>
            )}

            {review.isError && (
                <Alert variant="error" message="Could not load the attempt review. Please try again." />
            )}

            {review.data && (
                <div className="flex flex-col gap-4">
                    {/* ─── Summary banner ─────────────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <div>
                            <p className="text-xs text-ink-600">Score</p>
                            <p className="text-lg font-semibold text-ink-900">
                                {review.data.summary.total_score} / {review.data.summary.max_score}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-ink-600">Percentage</p>
                            <p className="text-lg font-semibold text-ink-900">
                                {review.data.summary.score_percent !== null ? `${review.data.summary.score_percent}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-ink-600">Time Taken</p>
                            <p className="flex items-center gap-1 text-lg font-semibold text-ink-900">
                                <Clock className="size-4 text-ink-400" aria-hidden="true" />
                                {formatDuration(review.data.summary.time_taken_seconds)}
                            </p>
                        </div>
                        <div className="ml-auto">
                            {review.data.status === 'submitted' ? (
                                <Badge label="Awaiting Grading" tone="neutral" />
                            ) : review.data.summary.passed ? (
                                <Badge label="Passed" tone="success" icon={CheckCircle2} />
                            ) : (
                                <Badge label="Not Passed" tone="danger" icon={XCircle} />
                            )}
                        </div>
                    </div>

                    {review.data.status === 'submitted' && (
                        <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-600">
                            Some answers are still pending instructor grading — scores below may change.
                        </p>
                    )}

                    {/* ─── Question review cards ──────────────────────────────── */}
                    {review.data.questions.map((question, index) => (
                        <ReviewQuestionCard key={question.question_id} question={question} index={index} />
                    ))}
                </div>
            )}
        </Modal>
    );
}
