import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import type { EvaluationPayload } from '@/features/assessment/api';

interface EvaluationQuickFormProps {
    onSubmit: (payload: EvaluationPayload) => Promise<void>;
    onCancel: () => void;
}

/**
 * Creates the evaluation shell (pass score, attempt/time limits). Questions are attached
 * separately via the question bank tooling, not from this quick-create form.
 */
export function EvaluationQuickForm({ onSubmit, onCancel }: EvaluationQuickFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [passScore, setPassScore] = useState('70');
    const [maxAttempts, setMaxAttempts] = useState('');
    const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                title,
                description: description || undefined,
                pass_score: Number(passScore),
                max_attempts: maxAttempts ? Number(maxAttempts) : undefined,
                time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : undefined,
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not create the evaluation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            {/* ── Coloured header banner ── */}
            <div className="flex items-center gap-3 rounded-t-lg bg-emerald-50 px-5 py-4 border-b border-emerald-100">
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-100">
                    <ListChecks className="size-4 text-emerald-600" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-emerald-900">New evaluation</p>
                    <p className="text-xs text-emerald-500">Questions are added from the question bank after creation</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
                {error && <Alert variant="error" message={error} />}

                {/* Basic info */}
                <div className="flex flex-col gap-3">
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <Textarea
                        label="Description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Limits row */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Limits</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                            label="Pass score (%)"
                            type="number"
                            value={passScore}
                            onChange={(e) => setPassScore(e.target.value)}
                            required
                        />
                        <Input
                            label="Max attempts"
                            type="number"
                            placeholder="Unlimited"
                            value={maxAttempts}
                            onChange={(e) => setMaxAttempts(e.target.value)}
                        />
                        <Input
                            label="Time limit (min)"
                            type="number"
                            placeholder="No limit"
                            value={timeLimitMinutes}
                            onChange={(e) => setTimeLimitMinutes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" isLoading={isSubmitting}>
                        Add evaluation
                    </Button>
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        </form>
    );
}
