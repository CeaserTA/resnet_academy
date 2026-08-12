import { useState } from 'react';
import { Link } from 'react-router';
import {
    CalendarCheck,
    ChevronDown,
    ChevronRight,
    Clock,
    ClipboardList,
    FileCheck2,
    FileEdit,
    ListChecks,
    Pencil,
    Trash2,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Module, ModuleItem } from '@/lib/api/types';
import type { ResourcePayload } from '@/features/courseStructure/api';
import type { AssignmentPayload, EvaluationPayload } from '@/features/assessment/api';

// ─── Resource type labels ─────────────────────────────────────────────────────

const resourceTypeLabels: Record<string, string> = {
    video: 'Video',
    document: 'Document',
    reading: 'Reading',
    external_link: 'Link',
    scorm: 'SCORM',
    live_session: 'Live',
    downloadable_file: 'Download',
};

type AddingForm = 'resource' | 'assignment' | 'evaluation' | null;

// ─── Icon button helper ───────────────────────────────────────────────────────

function IconBtn({
    label,
    onClick,
    danger = false,
    children,
}: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cn(
                'flex items-center justify-center rounded-lg p-1.5 transition-colors',
                danger
                    ? 'text-ink-400 hover:bg-danger-600/10 hover:text-danger-600'
                    : 'text-ink-400 hover:bg-surface-100 hover:text-ink-900',
            )}
        >
            {children}
        </button>
    );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, onDelete }: { item: ModuleItem; onDelete: () => void }) {
    const typeLabel =
        item.item_type === 'assignment'
            ? 'Assignment'
            : item.item_type === 'evaluation'
                ? 'Evaluation'
                : (resourceTypeLabels[item.type] ?? item.type);

    const tone = item.item_type === 'resource' ? 'neutral' : 'progress';
    const icon = item.item_type === 'assignment' ? FileCheck2 : item.item_type === 'evaluation' ? ClipboardList : undefined;

    const editHref =
        item.item_type === 'assignment'
            ? `/admin/assignments/${item.id}`
            : item.item_type === 'evaluation'
                ? `/admin/evaluations/${item.id}`
                : null;

    const attendanceHref =
        item.item_type === 'resource' && item.type === 'live_session'
            ? `/admin/resources/${item.id}/attendance`
            : null;

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
                <Badge label={typeLabel} tone={tone} icon={icon} />
                <span className="truncate text-sm text-ink-900">{item.title}</span>
                {!item.is_required && (
                    <span className="shrink-0 text-xs text-ink-300">optional</span>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                {attendanceHref && (
                    <Link to={attendanceHref}>
                        <IconBtn label={`Attendance for ${item.title}`} onClick={() => { }}>
                            <CalendarCheck className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                    </Link>
                )}
                {editHref && (
                    <Link to={editHref}>
                        <IconBtn label={`Grade ${item.title}`} onClick={() => { }}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                    </Link>
                )}
                <IconBtn label={`Delete ${item.title}`} onClick={onDelete} danger>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                </IconBtn>
            </div>
        </div>
    );
}

// ─── Module table row ─────────────────────────────────────────────────────────

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
        if (item.item_type === 'assignment') deleteAssignment.mutate(item.id);
        else if (item.item_type === 'evaluation') deleteEvaluation.mutate(item.id);
        else deleteResource.mutate(item.id);
    };

    const opensInFuture = module.scheduled_start_at && new Date(module.scheduled_start_at) > new Date();

    const handleDeleteModule = () => {
        if (window.confirm(`Delete "${module.title}"? It'll move to Recently Deleted and can be restored for 30 days.`)) {
            onDelete();
        }
    };

    return (
        <>
            {/* ── Summary row ────────────────────────────────────────────── */}
            <tr className="hover:bg-surface-50">
                <td className="px-4 py-3">
                    <button
                        onClick={() => setIsOpen((v) => !v)}
                        className="flex w-full items-center gap-3 text-left"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse ${module.title}` : `Expand ${module.title}`}
                    >
                        {isOpen
                            ? <ChevronDown className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                            : <ChevronRight className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                        }
                        {/* Module number chip */}
                        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-blue-600/10 text-xs font-semibold text-blue-600">
                            {index + 1}
                        </span>
                        <span className="text-sm font-medium text-ink-900">{module.title}</span>
                        <span className="text-xs text-ink-400">
                            · {module.items.length} item{module.items.length !== 1 ? 's' : ''}
                        </span>
                    </button>
                </td>

                <td className="px-4 py-3">
                    {opensInFuture ? (
                        <Badge
                            label={`Opens ${new Date(module.scheduled_start_at as string).toLocaleDateString()}`}
                            tone="warning"
                            icon={Clock}
                        />
                    ) : (
                        <Badge label="Active" tone="success" />
                    )}
                </td>

                <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                        <IconBtn label={`Add resource to ${module.title}`} onClick={() => setAddingForm('resource')}>
                            <FileEdit className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                        <IconBtn label={`Add assignment to ${module.title}`} onClick={() => setAddingForm('assignment')}>
                            <FileCheck2 className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                        <IconBtn label={`Add evaluation to ${module.title}`} onClick={() => setAddingForm('evaluation')}>
                            <ListChecks className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                        <IconBtn label={`Delete ${module.title}`} onClick={handleDeleteModule} danger>
                            <Trash2 className="size-3.5" aria-hidden="true" />
                        </IconBtn>
                    </div>
                </td>
            </tr>

            {/* ── Expanded items row ────────────────────────────────────── */}
            {isOpen && (
                <tr>
                    <td colSpan={3} className="bg-surface-50 px-4 pb-3 pt-1">
                        <div className="flex flex-col gap-1.5 rounded-xl border border-surface-100 bg-surface-0 p-3">
                            {module.items.length === 0 ? (
                                <p className="py-2 text-center text-xs text-ink-400">
                                    No content yet — use the icons above to add resources, assignments, or evaluations.
                                </p>
                            ) : (
                                module.items.map((item) => (
                                    <ItemRow
                                        key={`${item.item_type}-${item.id}`}
                                        item={item}
                                        onDelete={() => deleteItem(item)}
                                    />
                                ))
                            )}
                        </div>
                    </td>
                </tr>
            )}

            {/* ── Add-content modals ────────────────────────────────────── */}
            <Modal isOpen={addingForm === 'resource'} onClose={() => setAddingForm(null)} title={`Add resource — ${module.title}`} className="max-w-2xl">
                <ResourceForm onSubmit={handleCreateResource} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'assignment'} onClose={() => setAddingForm(null)} title={`Add assignment — ${module.title}`}>
                <AssignmentQuickForm onSubmit={handleCreateAssignment} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'evaluation'} onClose={() => setAddingForm(null)} title={`Add evaluation — ${module.title}`}>
                <EvaluationQuickForm onSubmit={handleCreateEvaluation} onCancel={() => setAddingForm(null)} />
            </Modal>
        </>
    );
}
