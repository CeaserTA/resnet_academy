import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/lib/api/types';

/**
 * Labels keyed by QuestionType — the Select component stores string values, so the
 * type is cast back via the QuestionType union on submit.
 */
const QUESTION_TYPE_OPTIONS = [
    { label: 'Single choice (MCQ)', value: 'mcq_single' },
    { label: 'Multiple choice', value: 'mcq_multi' },
    { label: 'True / False', value: 'true_false' },
    { label: 'Short answer', value: 'short_answer' },
    { label: 'Essay', value: 'essay' },
];

/** True / False questions always ship exactly these two options — the user only picks which is correct. */
const TRUE_FALSE_OPTIONS = [
    { option_text: 'True', is_correct: false },
    { option_text: 'False', is_correct: false },
];

/** Question types that accept an options list. */
const OPTION_TYPES: QuestionType[] = ['mcq_single', 'mcq_multi', 'true_false'];

interface OptionDraft {
    option_text: string;
    is_correct: boolean;
}

interface QuestionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        type: QuestionType;
        question_text: string;
        points: number;
        options?: { option_text: string; is_correct?: boolean }[];
    }) => Promise<void>;
    isSubmitting?: boolean;
}

export function QuestionForm({ isOpen, onClose, onSubmit, isSubmitting }: QuestionFormProps) {
    const [type, setType] = useState<QuestionType>('mcq_single');
    const [questionText, setQuestionText] = useState('');
    const [points, setPoints] = useState(1);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [options, setOptions] = useState<OptionDraft[]>([
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
    ]);

    const hasOptions = OPTION_TYPES.includes(type);

    const resetForm = () => {
        setType('mcq_single');
        setQuestionText('');
        setPoints(1);
        setSubmitError(null);
        setOptions([
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false },
        ]);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleTypeChange = (newType: QuestionType) => {
        setType(newType);
        if (newType === 'true_false') {
            setOptions(TRUE_FALSE_OPTIONS.map((o) => ({ ...o })));
        } else if (OPTION_TYPES.includes(newType)) {
            setOptions([
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false },
            ]);
        } else {
            setOptions([]);
        }
    };

    const addOption = () => {
        setOptions((prev) => [...prev, { option_text: '', is_correct: false }]);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, field: keyof OptionDraft, value: string | boolean) => {
        setOptions((prev) =>
            prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
        );
    };

    /**
     * For mcq_single, only one option can be correct — unchecking others when one is toggled on.
     * For mcq_multi, multiple correct options are allowed.
     */
    const toggleCorrect = (index: number) => {
        setOptions((prev) => {
            const isCurrentlyCorrect = prev[index].is_correct;
            if (type === 'mcq_single') {
                return prev.map((opt, i) => ({
                    ...opt,
                    is_correct: i === index ? !isCurrentlyCorrect : false,
                }));
            }
            return prev.map((opt, i) =>
                i === index ? { ...opt, is_correct: !isCurrentlyCorrect } : opt,
            );
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const payload: {
            type: QuestionType;
            question_text: string;
            points: number;
            options?: { option_text: string; is_correct?: boolean }[];
        } = {
            type,
            question_text: questionText.trim(),
            points,
        };

        if (hasOptions) {
            payload.options = options.map((o) => ({
                option_text: o.option_text.trim(),
                is_correct: o.is_correct,
            }));
        }

        try {
            await onSubmit(payload);
            resetForm();
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : 'Failed to create question. Please try again.',
            );
        }
    };

    const isValid =
        questionText.trim().length > 0 &&
        points > 0 &&
        (!hasOptions || options.every((o) => o.option_text.trim().length > 0)) &&
        (!hasOptions || options.some((o) => o.is_correct));

    const invalidReason = !questionText.trim()
        ? 'Enter the question text.'
        : !(points > 0)
          ? 'Points must be greater than 0.'
          : hasOptions && !options.every((o) => o.option_text.trim().length > 0)
            ? 'Every option needs text.'
            : hasOptions && !options.some((o) => o.is_correct)
              ? 'Mark at least one option as the correct answer.'
              : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Question"
            className="max-w-lg"
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="question-form"
                        disabled={!isValid}
                        isLoading={isSubmitting}
                    >
                        Add Question
                    </Button>
                </>
            }
        >
            <form
                id="question-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
            >
                <Select
                    label="Question Type"
                    options={QUESTION_TYPE_OPTIONS}
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                />

                <Textarea
                    label="Question Text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the question…"
                    rows={3}
                    required
                />

                <Input
                    label="Points"
                    type="number"
                    min={1}
                    value={String(points)}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    required
                />

                {/* ─── Options editor ─────────────────────────────────────────────── */}
                {hasOptions && (
                    <fieldset className="flex flex-col gap-2">
                        <legend className="text-sm font-medium text-ink-900">
                            Options
                            {type === 'mcq_single' && (
                                <span className="ml-1 text-xs font-normal text-ink-500">
                                    (select one correct answer)
                                </span>
                            )}
                            {type === 'mcq_multi' && (
                                <span className="ml-1 text-xs font-normal text-ink-500">
                                    (select all correct answers)
                                </span>
                            )}
                        </legend>

                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type={type === 'mcq_multi' ? 'checkbox' : 'radio'}
                                    name="correct-option"
                                    checked={option.is_correct}
                                    onChange={() => toggleCorrect(index)}
                                    className="size-4 shrink-0 accent-blue-600"
                                    aria-label={`Mark option ${index + 1} as correct`}
                                />
                                <input
                                    type="text"
                                    value={option.option_text}
                                    onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                                    disabled={type === 'true_false'}
                                    placeholder={`Option ${index + 1}`}
                                    className={cn(
                                        'flex-1 rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 shadow-sm',
                                        'placeholder:text-ink-300',
                                        'focus-visible:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                                    )}
                                    required
                                />
                                {type !== 'true_false' && options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-surface-100 hover:text-danger-600"
                                        aria-label={`Remove option ${index + 1}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {type !== 'true_false' && options.length < 8 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addOption}
                                className="self-start"
                            >
                                <Plus className="size-3.5" />
                                Add option
                            </Button>
                        )}
                    </fieldset>
                )}

                {submitError && (
                    <p className="rounded-md bg-danger-600/10 px-3 py-2 text-sm text-danger-600">
                        {submitError}
                    </p>
                )}

                {!isValid && (
                    <p className="text-xs text-ink-500">{invalidReason}</p>
                )}
            </form>
        </Modal>
    );
}
