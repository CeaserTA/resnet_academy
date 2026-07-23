import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, ChevronDown, ChevronRight, ClipboardList, Clock, FileCheck2, FileEdit, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ResourceForm } from '@/features/courseStructure/ResourceForm';
import { AssignmentQuickForm } from '@/features/assessment/AssignmentQuickForm';
import { EvaluationQuickForm } from '@/features/assessment/EvaluationQuickForm';
import { useCreateResource, useDeleteResource } from '@/features/courseStructure/useCourseStructure';
import {
    useCreateAssignment,
    useCreateEvaluation,
    useDeleteAssignment,
    useDeleteEvaluation,
} from '@/features/assessment/useAssessment';
import type { Module, ModuleItem } from '@/lib/api/types';
import type { ResourcePayload } from '@/features/courseStructure/api';
import type { AssignmentPayload, EvaluationPayload } from '@/features/assessment/api';

const resourceTypeLabels: Record<string, string> = {
    video: 'Video',
    document: 'Document',
    reading: 'Reading',
    external_link: 'External link',
    scorm: 'SCORM',
    live_session: 'Live session',
    downloadable_file: 'Download',
};

type AddingForm = 'resource' | 'assignment' | 'evaluation' | null;

function ItemRow({ item, onDelete }: { item: ModuleItem; onDelete: () => void }) {
    if (item.item_type === 'assignment') {
        return (
            <div className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Badge label="Assignment" tone="progress" icon={FileCheck2} />
                    <span className="text-sm text-ink-900">{item.title}</span>
                    {!item.is_required && <span className="text-xs text-ink-600">(optional)</span>}
                </div>
                <div className="flex items-center gap-1">
                    <Link to={`/admin/assignments/${item.id}`}>
                        <Button variant="ghost" className="px-2 py-1" aria-label={`Grade submissions for ${item.title}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>
                    <Button variant="ghost" className="px-2 py-1" onClick={onDelete} aria-label={`Delete ${item.title}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        );
    }

    if (item.item_type === 'evaluation') {
        return (
            <div className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Badge label="Evaluation" tone="progress" icon={ClipboardList} />
                    <span className="text-sm text-ink-900">{item.title}</span>
                    {!item.is_required && <span className="text-xs text-ink-600">(optional)</span>}
                </div>
                <div className="flex items-center gap-1">
                    <Link to={`/admin/evaluations/${item.id}`}>
                        <Button variant="ghost" className="px-2 py-1" aria-label={`Grade attempts for ${item.title}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>
                    <Button variant="ghost" className="px-2 py-1" onClick={onDelete} aria-label={`Delete ${item.title}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2">
            <div className="flex items-center gap-2">
                <Badge label={resourceTypeLabels[item.type] ?? item.type} tone="progress" />
                <span className="text-sm text-ink-900">{item.title}</span>
                {!item.is_required && <span className="text-xs text-ink-600">(optional)</span>}
            </div>
            <div className="flex items-center gap-1">
                {item.type === 'live_session' && (
                    <Link to={`/admin/resources/${item.id}/attendance`}>
                        <Button variant="ghost" className="px-2 py-1" aria-label={`View attendance for ${item.title}`}>
                            <CalendarCheck className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>
                )}
                <Button variant="ghost" className="px-2 py-1" onClick={onDelete} aria-label={`Delete ${item.title}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}

/**
 * One row of the "Module Management" table (course builder redesign) — same state/handlers
 * `ModuleCard` used to own, just rendered as `<tr>` + a conditional expanded `<tr>` instead of a
 * `<Card>`. The three action icons open the existing add-forms in a `Modal` instead of expanding
 * inline; expanding the row (chevron or clicking the title) still shows the existing item list
 * and lets you delete them or the module itself, so none of that capability is lost.
 */
export function ModuleTableRow({
    index,
    module,
    courseId,
    onDelete,
}: {
    index: number;
    module: Module;
    courseId: number;
    onDelete: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [addingForm, setAddingForm] = useState<AddingForm>(null);

    const createResource = useCreateResource(courseId);
    const deleteResource = useDeleteResource(courseId);
    const createAssignment = useCreateAssignment(courseId);
    const deleteAssignment = useDeleteAssignment(courseId);
    const createEvaluation = useCreateEvaluation(courseId);
    const deleteEvaluation = useDeleteEvaluation(courseId);

    const handleCreateResource = async (payload: ResourcePayload) => {
        await createResource.mutateAsync({ moduleId: module.id, payload });
        setAddingForm(null);
    };

    const handleCreateAssignment = async (payload: AssignmentPayload) => {
        await createAssignment.mutateAsync({ moduleId: module.id, payload });
        setAddingForm(null);
    };

    const handleCreateEvaluation = async (payload: EvaluationPayload) => {
        await createEvaluation.mutateAsync({ moduleId: module.id, payload });
        setAddingForm(null);
    };

    const deleteItem = (item: ModuleItem) => {
        if (item.item_type === 'assignment') {
            deleteAssignment.mutate(item.id);
        } else if (item.item_type === 'evaluation') {
            deleteEvaluation.mutate(item.id);
        } else {
            deleteResource.mutate(item.id);
        }
    };

    const opensInFuture = module.scheduled_start_at && new Date(module.scheduled_start_at) > new Date();

    return (
        <>
            <tr className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                <td className="px-4 py-3">
                    <button
                        onClick={() => setIsOpen((v) => !v)}
                        className="flex w-full items-center gap-3 text-left"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse ${module.title}` : `Expand ${module.title}`}
                    >
                        {isOpen ? (
                            <ChevronDown className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                        ) : (
                            <ChevronRight className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                        )}
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-600/10 text-xs font-medium text-blue-600">
                            {index + 1}
                        </span>
                        <span className="text-sm text-ink-900">{module.title}</span>
                    </button>
                </td>
                <td className="px-4 py-3">
                    {opensInFuture ? (
                        <Badge label={`Opens ${new Date(module.scheduled_start_at as string).toLocaleDateString()}`} tone="warning" icon={Clock} />
                    ) : (
                        <Badge label="Active" tone="success" />
                    )}
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => setAddingForm('resource')}
                            aria-label={`Add a resource to ${module.title}`}
                        >
                            <FileEdit className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => setAddingForm('assignment')}
                            aria-label={`Add an assignment to ${module.title}`}
                        >
                            <FileCheck2 className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => setAddingForm('evaluation')}
                            aria-label={`Add an evaluation to ${module.title}`}
                        >
                            <ListChecks className="size-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" className="px-2 py-1" onClick={onDelete} aria-label={`Delete ${module.title}`}>
                            <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                </td>
            </tr>

            {isOpen && (
                <tr className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                    <td colSpan={3} className="px-4 pb-3">
                        <div className="flex flex-col gap-2 rounded-md border border-surface-100 p-3">
                            {module.items.length === 0 && <p className="text-sm text-ink-600">No content yet.</p>}

                            {module.items.map((item) => (
                                <ItemRow key={`${item.item_type}-${item.id}`} item={item} onDelete={() => deleteItem(item)} />
                            ))}
                        </div>
                    </td>
                </tr>
            )}

            <Modal isOpen={addingForm === 'resource'} onClose={() => setAddingForm(null)} title={`Add a resource to ${module.title}`}>
                <ResourceForm onSubmit={handleCreateResource} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'assignment'} onClose={() => setAddingForm(null)} title={`Add an assignment to ${module.title}`}>
                <AssignmentQuickForm onSubmit={handleCreateAssignment} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'evaluation'} onClose={() => setAddingForm(null)} title={`Add an evaluation to ${module.title}`}>
                <EvaluationQuickForm onSubmit={handleCreateEvaluation} onCancel={() => setAddingForm(null)} />
            </Modal>
        </>
    );
}
