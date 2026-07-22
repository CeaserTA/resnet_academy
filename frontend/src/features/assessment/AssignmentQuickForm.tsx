import { useState } from 'react';
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
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4"
        >
            {error && <Alert variant="error" message={error} />}

            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea
                label="Instructions"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                    label="Submission type"
                    value={submissionType}
                    onChange={(e) => setSubmissionType(e.target.value as AssignmentSubmissionType)}
                >
                    <option value="file">File</option>
                    <option value="text">Text</option>
                    <option value="both">Either</option>
                </Select>
                <Input label="Max score" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
                <Input label="Due at" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-900">
                <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />
                Accept late submissions (with penalty)
            </label>

            <div className="flex gap-2">
                <Button type="submit" isLoading={isSubmitting}>
                    Add assignment
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
