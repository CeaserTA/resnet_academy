import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useDetachCohortCourse } from './useCohorts';
import type { ApiError } from '@/lib/api/client';
import type { CohortCourse } from '@/lib/api/types';

interface DetachCohortCourseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    cohortId: number;
    cohortCourse: CohortCourse;
    onError: (message: string) => void;
}

export function DetachCohortCourseDialog({ isOpen, onClose, cohortId, cohortCourse, onError }: DetachCohortCourseDialogProps) {
    const detachCohortCourse = useDetachCohortCourse(cohortId);

    const handleDetach = async () => {
        try {
            await detachCohortCourse.mutateAsync(cohortCourse.id);
            onClose();
        } catch (error) {
            const apiError = error as ApiError;
            if (apiError.status === 422) {
                onError("Cannot remove a course with enrollment or application history. Use 'Closed' status instead.");
            } else {
                onError('Failed to remove course from cohort. Please try again.');
            }
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Remove "${cohortCourse.course?.title}" from this cohort?`}>
            <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-700">
                    This action cannot be undone. Only offerings with no enrollment or application history can be removed.
                </p>

                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDetach} isLoading={detachCohortCourse.isPending}>
                        Remove course
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
