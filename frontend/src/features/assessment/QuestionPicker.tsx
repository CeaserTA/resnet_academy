import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Check, ChevronDown, ChevronRight, GripVertical, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useQuestionBanks } from '@/features/assessment/useAssessment';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/api/types';

/** Friendly label for the question type enum values stored by the backend. */
const TYPE_LABELS: Record<string, string> = {
    mcq_single: 'Single choice',
    mcq_multi: 'Multiple choice',
    true_false: 'True / False',
    short_answer: 'Short answer',
    essay: 'Essay',
};

interface QuestionPickerProps {
    courseId: number;
    /** The question IDs currently linked to this evaluation (from the last PATCH response). */
    initialSelectedIds: number[];
    /** Called when the instructor clicks Save — receives the ordered list of selected question IDs. */
    onSave: (questionIds: number[]) => Promise<void> | void;
    isSaving?: boolean;
}

/**
 * Displays every question in every question bank for the course, with checkboxes for selection.
 * The instructor checks the questions they want attached to this evaluation and clicks Save.
 *
 * The component tracks its own local selection state (not the server state) so the instructor
 * can freely toggle without triggering network requests until they explicitly save.
 */
export function QuestionPicker({
    courseId,
    initialSelectedIds,
    onSave,
    isSaving,
}: QuestionPickerProps) {
    const banks = useQuestionBanks(courseId);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));
    const [expandedBanks, setExpandedBanks] = useState<Set<number>>(new Set());
    /** Tracks whether the user has made any changes since the last save. */
    const [isDirty, setIsDirty] = useState(false);

    // Re-sync local selection when the parent pushes new initial IDs (e.g. after a successful save).
    useEffect(() => {
        setSelectedIds(new Set(initialSelectedIds));
        setIsDirty(false);
    }, [initialSelectedIds]);

    // Auto-expand banks that contain selected questions on first render.
    useEffect(() => {
        if (!banks.data || expandedBanks.size > 0) return;
        const banksWithSelected = new Set<number>();
        for (const bank of banks.data) {
            if (bank.questions.some((q) => selectedIds.has(q.id))) {
                banksWithSelected.add(bank.id);
            }
        }
        if (banksWithSelected.size > 0) {
            setExpandedBanks(banksWithSelected);
        }
    }, [banks.data, selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const toggleQuestion = (questionId: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });
        setIsDirty(true);
    };

    const toggleAllInBank = (questions: Question[]) => {
        const allSelected = questions.every((q) => selectedIds.has(q.id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const q of questions) {
                if (allSelected) {
                    next.delete(q.id);
                } else {
                    next.add(q.id);
                }
            }
            return next;
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        // Send the IDs in selection order — the backend uses array index as order_index in the pivot.
        const ids = Array.from(selectedIds);
        await onSave(ids);
        setIsDirty(false);
    };

    const totalQuestions = useMemo(
        () => banks.data?.reduce((acc, bank) => acc + bank.questions.length, 0) ?? 0,
        [banks.data],
    );

    if (banks.isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Spinner />
            </div>
        );
    }

    if (!banks.data || banks.data.length === 0) {
        return (
            <EmptyState
                icon={Banknote}
                title="No question banks yet"
                description="Create a question bank first to start adding questions to this evaluation."
            />
        );
    }

    if (totalQuestions === 0) {
        return (
            <EmptyState
                icon={AlertCircle}
                title="No questions available"
                description="Your question banks exist but contain no questions yet. Add questions from the Question Banks panel."
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ─── Toolbar ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-ink-600">
                        Select questions from the banks below to include in this evaluation.
                    </p>
                </div>
                <Badge
                    label={`${selectedIds.size} selected`}
                    tone={selectedIds.size > 0 ? 'progress' : 'neutral'}
                />
            </div>

            {/* ─── Bank list ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                {banks.data.map((bank) => {
                    const isExpanded = expandedBanks.has(bank.id);
                    const selectedInBank = bank.questions.filter((q) => selectedIds.has(q.id)).length;
                    const allSelected = bank.questions.length > 0 && selectedInBank === bank.questions.length;

                    return (
                        <div
                            key={bank.id}
                            className="rounded-lg border border-surface-100 bg-surface-0"
                        >
                            {/* Bank header */}
                            <div className="flex items-center gap-2 px-3 py-2.5">
                                <button
                                    type="button"
                                    onClick={() => toggleBank(bank.id)}
                                    className="flex flex-1 items-center gap-2 text-left"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="size-4 shrink-0 text-ink-400" />
                                    ) : (
                                        <ChevronRight className="size-4 shrink-0 text-ink-400" />
                                    )}
                                    <span className="text-sm font-medium text-ink-900">
                                        {bank.title}
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        ({selectedInBank}/{bank.questions.length})
                                    </span>
                                </button>

                                {bank.questions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => toggleAllInBank(bank.questions)}
                                        className={cn(
                                            'shrink-0 rounded px-2 py-0.5 text-xs font-medium transition',
                                            allSelected
                                                ? 'text-blue-600 hover:bg-blue-50'
                                                : 'text-ink-500 hover:bg-surface-100',
                                        )}
                                    >
                                        {allSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                )}
                            </div>

                            {/* Question list */}
                            {isExpanded && (
                                <div className="border-t border-surface-100 px-1 py-1">
                                    {bank.questions.map((question) => {
                                        const isSelected = selectedIds.has(question.id);
                                        const correctLabels = question.options
                                            .filter((o) => o.is_correct)
                                            .map((o) => o.option_text)
                                            .join(', ');

                                        return (
                                            <button
                                                key={question.id}
                                                type="button"
                                                onClick={() => toggleQuestion(question.id)}
                                                className={cn(
                                                    'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition',
                                                    isSelected
                                                        ? 'bg-blue-600/5 hover:bg-blue-600/10'
                                                        : 'hover:bg-surface-50',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition',
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-600'
                                                            : 'border-surface-200 bg-surface-0',
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <Check className="size-3 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={cn(
                                                            'truncate text-sm',
                                                            isSelected
                                                                ? 'font-medium text-ink-900'
                                                                : 'text-ink-700',
                                                        )}
                                                    >
                                                        {question.question_text}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        {TYPE_LABELS[question.type] ?? question.type}
                                                        {' · '}
                                                        {question.points} pt
                                                        {Number(question.points) !== 1 ? 's' : ''}
                                                        {question.auto_gradable && (
                                                            <>
                                                                {' · '}
                                                                <span className="text-success-600">
                                                                    Auto-graded
                                                                </span>
                                                            </>
                                                        )}
                                                        {correctLabels && (
                                                            <>
                                                                {' · '}
                                                                <span className="text-success-600">
                                                                    {correctLabels}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                <GripVertical
                                                    className="mt-0.5 size-3.5 shrink-0 text-ink-300"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ─── Save button ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-4">
                {isDirty && (
                    <p className="text-xs text-ink-500">Unsaved changes</p>
                )}
                <Button
                    onClick={handleSave}
                    disabled={!isDirty}
                    isLoading={isSaving}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        <>Save Questions ({selectedIds.size})</>
                    )}
                </Button>
            </div>
        </div>
    );
}
