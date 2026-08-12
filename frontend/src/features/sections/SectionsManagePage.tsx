import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSections } from './useSections';
import { SectionsList } from './SectionsList';
import { CreateSectionModal } from './CreateSectionModal';
import { EditSectionModal } from './EditSectionModal';
import { DeleteSectionDialog } from './DeleteSectionDialog';
import type { CourseSection } from './types';

interface SectionsManagePageProps {
    courseId: number;
    instructors?: Array<{ id: number; name: string }>;
}

export function SectionsManagePage({ courseId, instructors = [] }: SectionsManagePageProps) {
    const { data: sections, isLoading } = useSections(courseId);

    const [isCreating, setIsCreating] = useState(false);
    const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
    const [deletingSection, setDeletingSection] = useState<CourseSection | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleError = (message: string) => {
        setErrorMessage(message);
        // Auto-clear error after 5 seconds
        setTimeout(() => setErrorMessage(null), 5000);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg text-ink-900">Course Sections</h2>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    New Section
                </Button>
            </div>

            {errorMessage && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {errorMessage}
                </div>
            )}

            {isLoading && <Spinner />}

            {!isLoading && (!sections || sections.length === 0) && (
                <EmptyState
                    icon={Users}
                    title="No sections yet"
                    description="Create your first section to organize students into cohorts."
                />
            )}

            {!isLoading && sections && sections.length > 0 && (
                <SectionsList sections={sections} onEdit={setEditingSection} onDelete={setDeletingSection} />
            )}

            <CreateSectionModal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                courseId={courseId}
                instructors={instructors}
            />

            {editingSection && (
                <EditSectionModal
                    isOpen={true}
                    onClose={() => setEditingSection(null)}
                    courseId={courseId}
                    section={editingSection}
                    instructors={instructors}
                />
            )}

            {deletingSection && (
                <DeleteSectionDialog
                    isOpen={true}
                    onClose={() => setDeletingSection(null)}
                    courseId={courseId}
                    section={deletingSection}
                    onError={handleError}
                />
            )}
        </div>
    );
}
