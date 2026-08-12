import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useUpdateSection } from './useSections';
import { CourseSectionStatus, type CreateSectionInput, type CourseSection } from './types';
import type { ApiError } from '@/lib/api/client';

interface EditSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    section: CourseSection;
    instructors?: Array<{ id: number; name: string }>;
}

const ALLOWED_TRANSITIONS: Record<CourseSectionStatus, CourseSectionStatus[]> = {
    [CourseSectionStatus.Draft]: [CourseSectionStatus.Draft, CourseSectionStatus.Open],
    [CourseSectionStatus.Open]: [CourseSectionStatus.Open, CourseSectionStatus.InProgress, CourseSectionStatus.Closed],
    [CourseSectionStatus.InProgress]: [CourseSectionStatus.InProgress, CourseSectionStatus.Completed],
    [CourseSectionStatus.Closed]: [CourseSectionStatus.Closed, CourseSectionStatus.Open],
    [CourseSectionStatus.Completed]: [CourseSectionStatus.Completed],
};

export function EditSectionModal({ isOpen, onClose, courseId, section, instructors = [] }: EditSectionModalProps) {
    const updateSection = useUpdateSection(courseId, section.id);

    const [name, setName] = useState(section.name);
    const [startDate, setStartDate] = useState(section.start_date);
    const [endDate, setEndDate] = useState(section.end_date);
    const [applicationDeadline, setApplicationDeadline] = useState(section.application_deadline || '');
    const [capacity, setCapacity] = useState(section.capacity?.toString() || '');
    const [status, setStatus] = useState<CourseSectionStatus>(section.status);
    const [primaryInstructorId, setPrimaryInstructorId] = useState(section.primary_instructor_id?.toString() || '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when section changes
    useEffect(() => {
        setName(section.name);
        setStartDate(section.start_date);
        setEndDate(section.end_date);
        setApplicationDeadline(section.application_deadline || '');
        setCapacity(section.capacity?.toString() || '');
        setStatus(section.status);
        setPrimaryInstructorId(section.primary_instructor_id?.toString() || '');
        setErrors({});
    }, [section]);

    const newCapacity = capacity ? parseInt(capacity, 10) : undefined;
    const oldCapacity = section.capacity;
    const seatsTaken = section.seats_taken;

    // Capacity validation
    const capacityBelowSeats = newCapacity !== undefined && newCapacity < seatsTaken;
    const capacityReducedToSeats =
        newCapacity !== undefined &&
        oldCapacity !== undefined &&
        newCapacity < oldCapacity &&
        newCapacity >= seatsTaken &&
        newCapacity === seatsTaken;

    const allowedStatuses = ALLOWED_TRANSITIONS[section.status];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (capacityBelowSeats) {
            return;
        }

        setErrors({});

        const payload: Partial<CreateSectionInput> = {
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
            await updateSection.mutateAsync(payload);
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
        setName(section.name);
        setStartDate(section.start_date);
        setEndDate(section.end_date);
        setApplicationDeadline(section.application_deadline || '');
        setCapacity(section.capacity?.toString() || '');
        setStatus(section.status);
        setPrimaryInstructorId(section.primary_instructor_id?.toString() || '');
        setErrors({});
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Edit Section">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                    label="Section Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={errors.name}
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

                <div>
                    <Input
                        label="Capacity (optional, leave empty for unlimited)"
                        type="number"
                        min="1"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        error={errors.capacity}
                        placeholder="Leave empty for unlimited"
                    />

                    {capacityBelowSeats && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                            <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                Cannot reduce capacity below current enrollment count ({seatsTaken}). Please adjust capacity or withdraw
                                students first.
                            </p>
                        </div>
                    )}

                    {capacityReducedToSeats && !capacityBelowSeats && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>
                                Warning: Reducing capacity to {newCapacity}. No open seats available. Withdrawals will not trigger waitlist
                                promotion until capacity is increased again.
                            </p>
                        </div>
                    )}
                </div>

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
                        {Object.values(CourseSectionStatus).map((statusOption) => {
                            const isAllowed = allowedStatuses.includes(statusOption);
                            const label = statusOption
                                .split('_')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');

                            return (
                                <option key={statusOption} value={statusOption} disabled={!isAllowed}>
                                    {label}
                                    {!isAllowed && ' (not allowed)'}
                                </option>
                            );
                        })}
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
                    <Button type="submit" isLoading={updateSection.isPending} disabled={capacityBelowSeats}>
                        Update Section
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
