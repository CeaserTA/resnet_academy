import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useDeleteSection } from './useSections';
import type { CourseSection } from './types';
import type { ApiError } from '@/lib/api/client';

interface DeleteSectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    section: CourseSection;
    onError: (message: string) => void;
}

export function DeleteSectionDialog({ isOpen, onClose, courseId, section, onError }: DeleteSectionDialogProps) {
    const deleteSection = useDeleteSection(courseId, section.id);

    const handleDelete = async () => {
        try {
            await deleteSection.mutateAsync();
            onClose();
        } catch (error) {
            const apiError = error as ApiError;
            if (apiError.status === 422) {
                onError("Cannot delete section with history. Use 'Closed' status instead.");
            } else {
                onError('Failed to delete section. Please try again.');
            }
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Delete "${section.name}"?`}>
            <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-700">
                    This action cannot be undone. Only sections with no enrollment or application history can be deleted.
                </p>

                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDelete} isLoading={deleteSection.isPending}>
                        Delete Section
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
