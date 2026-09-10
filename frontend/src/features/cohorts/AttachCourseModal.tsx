import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCourses } from '@/features/catalogue/useCourses';
import { useUsers } from '@/features/admin/users/useAdminUsers';
import { useAttachCourse } from './useCohorts';
import type { ApiError } from '@/lib/api/client';
import type { CohortCourseStatus } from '@/lib/api/types';

interface AttachCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    cohortId: number;
    /** Courses already offered in this cohort — excluded from the picker. */
    excludeCourseIds: number[];
}

const STATUS_OPTIONS: { label: string; value: CohortCourseStatus }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Open', value: 'open' },
];

export function AttachCourseModal({ isOpen, onClose, cohortId, excludeCourseIds }: AttachCourseModalProps) {
    const attachCourse = useAttachCourse(cohortId);
    const { data: coursesPage } = useCourses({ status: 'published' });
    const { data: instructors = [] } = useUsers('instructor');

    const [courseId, setCourseId] = useState('');
    const [capacity, setCapacity] = useState('');
    const [status, setStatus] = useState<CohortCourseStatus>('draft');
    const [primaryInstructorId, setPrimaryInstructorId] = useState('');
    const [priceOverride, setPriceOverride] = useState('');
    const [currencyOverride, setCurrencyOverride] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const availableCourses = (coursesPage?.data ?? []).filter((c) => !excludeCourseIds.includes(c.id));

    const reset = () => {
        setCourseId('');
        setCapacity('');
        setStatus('draft');
        setPrimaryInstructorId('');
        setPriceOverride('');
        setCurrencyOverride('');
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
            await attachCourse.mutateAsync({
                course_id: Number(courseId),
                status,
                capacity: capacity ? Number(capacity) : undefined,
                primary_instructor_id: primaryInstructorId ? Number(primaryInstructorId) : undefined,
                price_override: priceOverride ? Number(priceOverride) : undefined,
                currency_override: currencyOverride || undefined,
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
        <Modal isOpen={isOpen} onClose={handleClose} title="Add a course to this cohort">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Select
                    label="Course"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    options={availableCourses.map((c) => ({ label: c.title, value: String(c.id) }))}
                    placeholder="Select a course"
                    required
                />
                {errors.course_id && <p className="-mt-2 text-xs text-red-600">{errors.course_id}</p>}

                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CohortCourseStatus)}
                    options={STATUS_OPTIONS}
                    required
                />

                <Input
                    label="Capacity (optional, leave empty for unlimited)"
                    type="number"
                    min="1"
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
                    <Button type="submit" isLoading={attachCourse.isPending} disabled={!courseId}>
                        Add course
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
