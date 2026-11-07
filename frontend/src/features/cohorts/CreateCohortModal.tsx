import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateCohort } from './useCohorts';
import type { ApiError } from '@/lib/api/client';

interface CreateCohortModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateCohortModal({ isOpen, onClose }: CreateCohortModalProps) {
    const createCohort = useCreateCohort();

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [applicationDeadline, setApplicationDeadline] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const reset = () => {
        setName('');
        setStartDate('');
        setEndDate('');
        setApplicationDeadline('');
        setErrors({});
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (startDate && endDate && endDate < startDate) {
            setErrors({ end_date: 'The end date must be on or after the start date.' });
            return;
        }

        try {
            await createCohort.mutateAsync({
                name,
                start_date: startDate,
                end_date: endDate,
                application_deadline: applicationDeadline || undefined,
            });
            reset();
            onClose();
        } catch (error) {
            const apiError = error as ApiError;
            if (apiError.fields) {
                const fieldErrors: Record<string, string> = {};
                Object.entries(apiError.fields).forEach(([field, messages]) => {
                    fieldErrors[field] = messages[0];
                });
                setErrors(fieldErrors);
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create cohort"
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="create-cohort-form" isLoading={createCohort.isPending}>
                        Create cohort
                    </Button>
                </>
            }
        >
            <form id="create-cohort-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                    label="Cohort name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={errors.name}
                    placeholder="e.g. September 2026"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                        label="Start date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        error={errors.start_date}
                    />
                    <Input
                        label="End date"
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        error={errors.end_date}
                    />
                </div>

                <div>
                    <Input
                        label="Application deadline (optional)"
                        type="date"
                        value={applicationDeadline}
                        max={startDate || undefined}
                        onChange={(e) => setApplicationDeadline(e.target.value)}
                        error={errors.application_deadline}
                    />
                    {!errors.application_deadline && (
                        <p className="mt-1 text-xs text-ink-600">The last day students can apply. Usually on or before the start date.</p>
                    )}
                </div>
            </form>
        </Modal>
    );
}
