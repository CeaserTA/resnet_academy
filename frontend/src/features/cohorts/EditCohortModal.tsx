import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUpdateCohort } from './useCohorts';
import type { ApiError } from '@/lib/api/client';
import type { Cohort, CohortStatus } from '@/lib/api/types';

interface EditCohortModalProps {
    isOpen: boolean;
    onClose: () => void;
    cohort: Cohort;
}

const STATUS_OPTIONS: { label: string; value: CohortStatus }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
];

export function EditCohortModal({ isOpen, onClose, cohort }: EditCohortModalProps) {
    const updateCohort = useUpdateCohort(cohort.id);

    const [name, setName] = useState(cohort.name);
    const [startDate, setStartDate] = useState(cohort.start_date);
    const [endDate, setEndDate] = useState(cohort.end_date);
    const [applicationDeadline, setApplicationDeadline] = useState(cohort.application_deadline ?? '');
    const [status, setStatus] = useState<CohortStatus>(cohort.status);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (startDate && endDate && endDate < startDate) {
            setErrors({ end_date: 'The end date must be on or after the start date.' });
            return;
        }

        try {
            await updateCohort.mutateAsync({
                name,
                start_date: startDate,
                end_date: endDate,
                application_deadline: applicationDeadline || undefined,
                status,
            });
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
            onClose={onClose}
            title="Edit cohort"
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="edit-cohort-form" isLoading={updateCohort.isPending}>
                        Save changes
                    </Button>
                </>
            }
        >
            <form id="edit-cohort-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                    label="Cohort name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={errors.name}
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

                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CohortStatus)}
                    options={STATUS_OPTIONS}
                    required
                />
            </form>
        </Modal>
    );
}
