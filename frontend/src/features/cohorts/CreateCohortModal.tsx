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
        <Modal isOpen={isOpen} onClose={handleClose} title="Create cohort">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                    label="Cohort name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={errors.name}
                    placeholder="e.g., September 2026 Intake"
                />

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
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    error={errors.end_date}
                />

                <Input
                    label="Application deadline (optional)"
                    type="date"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    error={errors.application_deadline}
                />

                <div className="flex gap-2">
                    <Button type="submit" isLoading={createCohort.isPending}>
                        Create cohort
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
