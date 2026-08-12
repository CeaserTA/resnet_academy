import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateSection } from './useSections';
import { CourseSectionStatus, type CreateSectionInput } from './types';
import type { ApiError } from '@/lib/api/client';

interface CreateSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    instructors?: Array<{ id: number; name: string }>;
}

export function CreateSectionModal({ isOpen, onClose, courseId, instructors = [] }: CreateSectionModalProps) {
    const createSection = useCreateSection(courseId);

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [applicationDeadline, setApplicationDeadline] = useState('');
    const [capacity, setCapacity] = useState('');
    const [status, setStatus] = useState<CourseSectionStatus>(CourseSectionStatus.Draft);
    const [primaryInstructorId, setPrimaryInstructorId] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const payload: CreateSectionInput = {
            name,
            start_date: startDate,
            end_date: endDate,
            status,
        };

        if (applicationDeadline) {
            payload.application_deadline = applicationDeadline;
        }

        if (capacity) {
            payload.capacity = parseInt(capacity, 10);
        }

        if (primaryInstructorId) {
            payload.primary_instructor_id = parseInt(primaryInstructorId, 10);
        }

        try {
            await createSection.mutateAsync(payload);
            // Reset form
            setName('');
            setStartDate('');
            setEndDate('');
            setApplicationDeadline('');
            setCapacity('');
            setStatus(CourseSectionStatus.Draft);
            setPrimaryInstructorId('');
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

    const handleClose = () => {
        setName('');
        setStartDate('');
        setEndDate('');
        setApplicationDeadline('');
        setCapacity('');
        setStatus(CourseSectionStatus.Draft);
        setPrimaryInstructorId('');
        setErrors({});
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Section">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                    label="Section Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={errors.name}
                    placeholder="e.g., Spring 2026 Cohort"
                />

                <Input
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    error={errors.start_date}
                />

                <Input
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    error={errors.end_date}
                />

                <Input
                    label="Application Deadline (optional)"
                    type="date"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    error={errors.application_deadline}
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

                <div>
                    <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink-900">
                        Status
                    </label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CourseSectionStatus)}
                        className="w-full rounded-md border border-surface-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value={CourseSectionStatus.Draft}>Draft</option>
                        <option value={CourseSectionStatus.Open}>Open</option>
                        <option value={CourseSectionStatus.InProgress}>In Progress</option>
                        <option value={CourseSectionStatus.Completed}>Completed</option>
                        <option value={CourseSectionStatus.Closed}>Closed</option>
                    </select>
                    {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
                </div>

                {instructors.length > 0 && (
                    <div>
                        <label htmlFor="primary_instructor_id" className="mb-1 block text-sm font-medium text-ink-900">
                            Primary Instructor (optional)
                        </label>
                        <select
                            id="primary_instructor_id"
                            value={primaryInstructorId}
                            onChange={(e) => setPrimaryInstructorId(e.target.value)}
                            className="w-full rounded-md border border-surface-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">No instructor assigned</option>
                            {instructors.map((instructor) => (
                                <option key={instructor.id} value={instructor.id}>
                                    {instructor.name}
                                </option>
                            ))}
                        </select>
                        {errors.primary_instructor_id && <p className="mt-1 text-xs text-red-600">{errors.primary_instructor_id}</p>}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button type="submit" isLoading={createSection.isPending}>
                        Create Section
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
