import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, ChevronDown, ChevronUp, ClipboardList, Clock, FileCheck2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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

export function ModuleCard({ module, courseId, onDelete }: { module: Module; courseId: number; onDelete: () => void }) {
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

    return (
        <Card>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg">{module.title}</h3>
                        {module.scheduled_start_at && (
                            <Badge
                                label={`Opens ${new Date(module.scheduled_start_at).toLocaleDateString()}`}
                                tone="warning"
                                icon={Clock}
                            />
                        )}
                        {module.group_ids && module.group_ids.length > 0 && (
                            <Badge label="Group-scoped" tone="neutral" />
                        )}
                    </div>
                    {module.description && <p className="mt-1 text-sm text-ink-600">{module.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={() => setIsOpen((v) => !v)}
                        aria-label={isOpen ? `Collapse ${module.title}` : `Expand ${module.title}`}
                    >
                        {isOpen ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
                    </Button>
                    <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={onDelete}
                        aria-label={`Delete ${module.title}`}
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>

            {isOpen && (
                <div className="mt-4 flex flex-col gap-2 border-t border-surface-100 pt-4">
                    {module.items.length === 0 && <p className="text-sm text-ink-600">No content yet.</p>}

                    {module.items.map((item) => (
                        <ItemRow
                            key={`${item.item_type}-${item.id}`}
                            item={item}
                            onDelete={() => deleteItem(item)}
                        />
                    ))}

                    {addingForm === 'resource' && (
                        <ResourceForm onSubmit={handleCreateResource} onCancel={() => setAddingForm(null)} />
                    )}
                    {addingForm === 'assignment' && (
                        <AssignmentQuickForm onSubmit={handleCreateAssignment} onCancel={() => setAddingForm(null)} />
                    )}
                    {addingForm === 'evaluation' && (
                        <EvaluationQuickForm onSubmit={handleCreateEvaluation} onCancel={() => setAddingForm(null)} />
                    )}

                    {addingForm === null && (
                        <div className="mt-2 flex gap-2">
                            <Button variant="secondary" onClick={() => setAddingForm('resource')}>
                                <Plus className="size-4" aria-hidden="true" />
                                Resource
                            </Button>
                            <Button variant="secondary" onClick={() => setAddingForm('assignment')}>
                                <Plus className="size-4" aria-hidden="true" />
                                Assignment
                            </Button>
                            <Button variant="secondary" onClick={() => setAddingForm('evaluation')}>
                                <Plus className="size-4" aria-hidden="true" />
                                Evaluation
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
