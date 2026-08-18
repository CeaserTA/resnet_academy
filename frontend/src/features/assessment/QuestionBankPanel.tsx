import { useState, type FormEvent } from 'react';
import { Banknote, ChevronDown, ChevronRight, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { QuestionForm } from '@/features/assessment/QuestionForm';
import { QuestionCsvImportModal } from '@/features/assessment/QuestionCsvImportModal';
import {
    useCreateQuestion,
    useCreateQuestionBank,
    useDeleteQuestion,
    useDeleteQuestionBank,
    useQuestionBanks,
} from '@/features/assessment/useAssessment';
import type { Question, QuestionBank } from '@/lib/api/types';

interface QuestionBankPanelProps {
    courseId: number;
}

/** Friendly label for the question type enum values stored by the backend. */
const TYPE_LABELS: Record<string, string> = {
    mcq_single: 'Single choice',
    mcq_multi: 'Multiple choice',
    true_false: 'True / False',
    short_answer: 'Short answer',
    essay: 'Essay',
};

/**
 * A full-page panel (rendered inside a wide Modal) that lets the instructor browse every question
 * bank in the course, create new banks, add questions to any bank, and delete banks or questions.
 *
 * It is intentionally separate from the QuestionPicker (which selects questions for an evaluation)
 * so it can also be opened from a course-level "Question Banks" link in the future.
 */
export function QuestionBankPanel({ courseId }: QuestionBankPanelProps) {
    const banks = useQuestionBanks(courseId);
    const createBank = useCreateQuestionBank(courseId);
    const deleteBank = useDeleteQuestionBank(courseId);
    const [expandedBanks, setExpandedBanks] = useState<Set<number>>(new Set());
    const [newBankTitle, setNewBankTitle] = useState('');
    const [showNewBankForm, setShowNewBankForm] = useState(false);
    const [creatingInBank, setCreatingInBank] = useState<number | null>(null);

    const toggleBank = (bankId: number) => {
        setExpandedBanks((prev) => {
            const next = new Set(prev);
            if (next.has(bankId)) {
                next.delete(bankId);
            } else {
                next.add(bankId);
            }
            return next;
        });
    };

    const handleCreateBank = async (e: FormEvent) => {
        e.preventDefault();
        if (!newBankTitle.trim()) return;
        await createBank.mutateAsync(newBankTitle.trim());
        setNewBankTitle('');
        setShowNewBankForm(false);
    };

    const handleDeleteBank = async (bankId: number) => {
        if (!window.confirm('Delete this question bank and all its questions? This cannot be undone.')) return;
        await deleteBank.mutateAsync(bankId);
    };

    if (banks.isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ─── New bank form ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-ink-600">
                    Question banks group questions by topic or module. Create one to start adding questions.
                </p>
                {!showNewBankForm && (
                    <Button size="sm" onClick={() => setShowNewBankForm(true)}>
                        <Plus className="size-3.5" />
                        New Bank
                    </Button>
                )}
            </div>

            {showNewBankForm && (
                <form onSubmit={handleCreateBank} className="flex items-end gap-2">
                    <div className="flex-1">
                        <Input
                            label="Bank Title"
                            labelClassName="sr-only"
                            placeholder="e.g. Module 1 — Networking Basics"
                            value={newBankTitle}
                            onChange={(e) => setNewBankTitle(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <Button type="submit" size="sm" isLoading={createBank.isPending}>
                        Create
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setShowNewBankForm(false);
                            setNewBankTitle('');
                        }}
                    >
                        Cancel
                    </Button>
                </form>
            )}

            {/* ─── Empty state ───────────────────────────────────────────────── */}
            {(!banks.data || banks.data.length === 0) && !showNewBankForm && (
                <EmptyState
                    icon={Banknote}
                    title="No question banks yet"
                    description="Create your first question bank to start building a library of questions."
                    action={
                        <Button size="sm" onClick={() => setShowNewBankForm(true)}>
                            <Plus className="size-3.5" />
                            Create Question Bank
                        </Button>
                    }
                />
            )}

            {/* ─── Bank list ─────────────────────────────────────────────────── */}
            {banks.data && banks.data.length > 0 && (
                <div className="flex flex-col gap-2">
                    {banks.data.map((bank) => (
                        <BankCard
                            key={bank.id}
                            bank={bank}
                            courseId={courseId}
                            isExpanded={expandedBanks.has(bank.id)}
                            onToggle={() => toggleBank(bank.id)}
                            onDelete={() => handleDeleteBank(bank.id)}
                            isDeleting={deleteBank.isPending}
                            creatingInBank={creatingInBank}
                            setCreatingInBank={setCreatingInBank}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── BankCard ──────────────────────────────────────────────────────────────────────────────

interface BankCardProps {
    bank: QuestionBank;
    courseId: number;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    isDeleting: boolean;
    creatingInBank: number | null;
    setCreatingInBank: (bankId: number | null) => void;
}

function BankCard({
    bank,
    courseId,
    isExpanded,
    onToggle,
    onDelete,
    isDeleting,
    creatingInBank,
    setCreatingInBank,
}: BankCardProps) {
    const createQuestion = useCreateQuestion(courseId);
    const deleteQuestion = useDeleteQuestion(courseId);
    const showQuestionForm = creatingInBank === bank.id;
    const [showImportModal, setShowImportModal] = useState(false);

    const handleCreateQuestion = async (data: {
        type: string;
        question_text: string;
        points: number;
        options?: { option_text: string; is_correct?: boolean }[];
    }) => {
        await createQuestion.mutateAsync({
            bankId: bank.id,
            payload: data as Parameters<typeof createQuestion.mutateAsync>[0]['payload'],
        });
        setCreatingInBank(null);
    };

    const handleDeleteQuestion = async (questionId: number) => {
        if (!window.confirm('Delete this question? This cannot be undone.')) return;
        await deleteQuestion.mutateAsync(questionId);
    };

    return (
        <div className="rounded-lg border border-surface-100 bg-surface-0">
            {/* Bank header */}
            <div
                className="flex cursor-pointer items-center gap-2 px-3 py-2.5 transition hover:bg-surface-50"
                onClick={onToggle}
            >
                {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-ink-400" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-ink-400" />
                )}
                <span className="flex-1 text-sm font-medium text-ink-900">{bank.title}</span>
                <Badge
                    label={`${bank.questions.length} question${bank.questions.length !== 1 ? 's' : ''}`}
                    tone="neutral"
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setCreatingInBank(bank.id);
                    }}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-surface-100 hover:text-blue-600"
                    aria-label="Add question to this bank"
                    title="Add question"
                >
                    <Plus className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowImportModal(true);
                    }}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-surface-100 hover:text-blue-600"
                    aria-label="Import questions from CSV"
                    title="Import CSV"
                >
                    <Upload className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    disabled={isDeleting}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-surface-100 hover:text-danger-600"
                    aria-label="Delete question bank"
                    title="Delete bank"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>

            {/* Expanded question list */}
            {isExpanded && (
                <div className="border-t border-surface-100 px-3 py-2">
                    {bank.questions.length === 0 && !showQuestionForm && (
                        <p className="py-3 text-center text-sm text-ink-500">
                            No questions yet. Click the + button above to add one.
                        </p>
                    )}
                    {bank.questions.length > 0 && (
                        <ul className="flex flex-col gap-1">
                            {bank.questions.map((q) => (
                                <QuestionRow
                                    key={q.id}
                                    question={q}
                                    onDelete={() => handleDeleteQuestion(q.id)}
                                    isDeleting={deleteQuestion.isPending}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Question form modal */}
            <QuestionForm
                isOpen={showQuestionForm}
                onClose={() => setCreatingInBank(null)}
                onSubmit={handleCreateQuestion}
                isSubmitting={createQuestion.isPending}
            />

            {/* CSV import modal */}
            <QuestionCsvImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                bankId={bank.id}
                courseId={courseId}
                bankTitle={bank.title}
            />
        </div>
    );
}

// ─── QuestionRow ───────────────────────────────────────────────────────────────────────────

interface QuestionRowProps {
    question: Question;
    onDelete: () => void;
    isDeleting: boolean;
}

function QuestionRow({ question, onDelete, isDeleting }: QuestionRowProps) {
    const correctLabels = question.options
        .filter((o) => o.is_correct)
        .map((o) => o.option_text)
        .join(', ');

    return (
        <li className="flex items-start gap-2 rounded-md px-2 py-1.5 transition hover:bg-surface-50">
            <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-ink-900">{question.question_text}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                    {TYPE_LABELS[question.type] ?? question.type}
                    {' · '}
                    {question.points} pt{Number(question.points) !== 1 ? 's' : ''}
                    {correctLabels && (
                        <>
                            {' · '}
                            <span className="text-success-600">{correctLabels}</span>
                        </>
                    )}
                </p>
            </div>
            <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:text-danger-600"
                aria-label="Delete question"
            >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
        </li>
    );
}

// ─── Public Modal wrapper ──────────────────────────────────────────────────────────────────

interface QuestionBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
}

/**
 * Wraps QuestionBankPanel in a full-width Modal so it can be opened from anywhere
 * in the app (e.g. from an evaluation edit page toolbar).
 */
export function QuestionBankModal({ isOpen, onClose, courseId }: QuestionBankModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Question Banks"
            className="max-h-[85vh] max-w-2xl"
            footer={
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            }
        >
            <QuestionBankPanel courseId={courseId} />
        </Modal>
    );
}
