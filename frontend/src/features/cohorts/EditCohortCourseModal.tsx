import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUsers } from '@/features/admin/users/useAdminUsers';
import { useUpdateCohortCourse } from './useCohorts';
import type { ApiError } from '@/lib/api/client';
import type { CohortCourse, CohortCourseStatus } from '@/lib/api/types';

interface EditCohortCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    cohortId: number;
    cohortCourse: CohortCourse;
}

const STATUS_OPTIONS: { label: string; value: CohortCourseStatus }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Open', value: 'open' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Closed', value: 'closed' },
];

export function EditCohortCourseModal({ isOpen, onClose, cohortId, cohortCourse }: EditCohortCourseModalProps) {
    const updateCohortCourse = useUpdateCohortCourse(cohortId, cohortCourse.id);
    const { data: instructors = [] } = useUsers('instructor');

    const [capacity, setCapacity] = useState(cohortCourse.capacity !== null ? String(cohortCourse.capacity) : '');
    const [status, setStatus] = useState<CohortCourseStatus>(cohortCourse.status);
    const [primaryInstructorId, setPrimaryInstructorId] = useState(
        cohortCourse.primary_instructor_id ? String(cohortCourse.primary_instructor_id) : '',
    );
    const [priceOverride, setPriceOverride] = useState(cohortCourse.price_override ?? '');
    const [currencyOverride, setCurrencyOverride] = useState(cohortCourse.currency_override ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            await updateCohortCourse.mutateAsync({
                capacity: capacity ? Number(capacity) : null,
                status,
                primary_instructor_id: primaryInstructorId ? Number(primaryInstructorId) : null,
                price_override: priceOverride ? Number(priceOverride) : null,
                currency_override: currencyOverride || null,
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${cohortCourse.course?.title ?? 'course offering'}`}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CohortCourseStatus)}
                    options={STATUS_OPTIONS}
                    required
                />
                {errors.status && <p className="-mt-2 text-xs text-red-600">{errors.status}</p>}

                <Input
                    label="Capacity (optional, leave empty for unlimited)"
                    type="number"
                    min="0"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    error={errors.capacity}
                    placeholder="Leave empty for unlimited"
                />

                {instructors.length > 0 && (
                    <Select
                        label="Primary instructor (optional)"
                        value={primaryInstructorId}
                        onChange={(e) => setPrimaryInstructorId(e.target.value)}
                        options={instructors.map((i) => ({ label: i.name, value: String(i.id) }))}
                        placeholder="No instructor assigned"
                    />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="Price override (optional)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceOverride}
                        onChange={(e) => setPriceOverride(e.target.value)}
                        error={errors.price_override}
                        placeholder="Uses course price"
                    />
                    <Input
                        label="Currency override"
                        value={currencyOverride}
                        onChange={(e) => setCurrencyOverride(e.target.value.toUpperCase())}
                        error={errors.currency_override}
                        placeholder="e.g. UGX"
                        maxLength={3}
                    />
                </div>

                <div className="flex gap-2">
                    <Button type="submit" isLoading={updateCohortCourse.isPending}>
                        Save changes
                    </Button>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
