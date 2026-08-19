import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import type { AssignmentSubmissionType } from '@/lib/api/types';
import type { AssignmentPayload } from '@/features/assessment/api';

interface AssignmentQuickFormProps {
    onSubmit: (payload: AssignmentPayload) => Promise<void>;
    onCancel: () => void;
}

/**
 * Covers the fields needed to create an assignment students can submit against. Rubrics
 * aren't editable here — add them via the assignment detail/grading screen once created.
 */
export function AssignmentQuickForm({ onSubmit, onCancel }: AssignmentQuickFormProps) {
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [submissionType, setSubmissionType] = useState<AssignmentSubmissionType>('both');
    const [dueAt, setDueAt] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [allowLate, setAllowLate] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                title,
                instructions: instructions || undefined,
                submission_type: submissionType,
                due_at: dueAt || undefined,
                allow_late: allowLate,
                max_score: maxScore ? Number(maxScore) : undefined,
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not create the assignment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            {/* ── Coloured header banner ── */}
            <div className="flex items-center gap-3 rounded-t-lg bg-violet-50 px-5 py-4 border-b border-violet-100">
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100">
                    <FileCheck2 className="size-4 text-violet-600" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-violet-900">New assignment</p>
                    <p className="text-xs text-violet-500">Rubrics can be added after creation</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
                {error && <Alert variant="error" message={error} />}

                {/* Basic info */}
                <div className="flex flex-col gap-3">
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <Textarea
                        label="Instructions"
                        rows={3}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                    />
                </div>

                {/* Settings row */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Settings</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Select
                            label="Submission type"
                            value={submissionType}
                            onChange={(e) => setSubmissionType(e.target.value as AssignmentSubmissionType)}
                        >
                            <option value="file">File upload</option>
                            <option value="text">Text entry</option>
                            <option value="both">Either</option>
                        </Select>
                        <Input
                            label="Max score"
                            type="number"
                            value={maxScore}
                            onChange={(e) => setMaxScore(e.target.value)}
                        />
                        <Input
                            label="Due at"
                            type="datetime-local"
                            value={dueAt}
                            onChange={(e) => setDueAt(e.target.value)}
                        />
                    </div>
                </div>

                {/* Late submissions toggle */}
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-4 py-3 transition hover:bg-surface-100">
                    <input
                        type="checkbox"
                        checked={allowLate}
                        onChange={(e) => setAllowLate(e.target.checked)}
                        className="size-4 rounded accent-violet-600"
                    />
                    <div>
                        <p className="text-sm font-medium text-ink-900">Accept late submissions</p>
                        <p className="text-xs text-ink-400">A penalty can be configured on the assignment page</p>
                    </div>
                </label>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" isLoading={isSubmitting}>
                        Add assignment
                    </Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </form>
    );
}
