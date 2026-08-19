import { useState } from 'react';
import { Link } from 'react-router';
import {
    BookOpen,
    CalendarCheck,
    ChevronDown,
    ChevronRight,
    Clock,
    ClipboardList,
    Download,
    FileCheck2,
    FileEdit,
    FileText,
    Globe,
    ListChecks,
    Package,
    Pencil,
    Plus,
    Radio,
    Trash2,
    Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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

// ─── Resource type labels + icons ─────────────────────────────────────────────

const resourceTypeLabels: Record<string, string> = {
    video: 'Video',
    document: 'Document',
    reading: 'Reading',
    external_link: 'Link',
    scorm: 'SCORM',
    live_session: 'Live',
    downloadable_file: 'Download',
};

const resourceTypeIcons: Record<string, React.ElementType> = {
    video: Video,
    document: FileText,
    reading: BookOpen,
    external_link: Globe,
    scorm: Package,
    live_session: Radio,
    downloadable_file: Download,
};

type AddingForm = 'resource' | 'assignment' | 'evaluation' | null;

// ─── Icon action button ────────────────────────────────────────────────────────

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

// ─── Descriptive action button ────────────────────────────────────────────────

function ActionBtn({
    label,
    description,
    onClick,
    icon: Icon,
    colorClass,
}: {
    label: string;
    description: string;
    onClick: () => void;
    icon: React.ElementType;
    colorClass: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={description}
            className={cn(
                'group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                colorClass,
            )}
        >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
        </button>
    );
}

// ─── Single item row ──────────────────────────────────────────────────────────

function ItemRow({ item, onDelete }: { item: ModuleItem; onDelete: () => void }) {
    const typeLabel =
        item.item_type === 'assignment'
            ? 'Assignment'
            : item.item_type === 'evaluation'
                ? 'Evaluation'
                : (resourceTypeLabels[item.type] ?? item.type);

    const tone = item.item_type === 'resource' ? 'neutral' : 'progress';
    const badgeIcon =
        item.item_type === 'assignment'
            ? FileCheck2
            : item.item_type === 'evaluation'
                ? ClipboardList
                : (resourceTypeIcons[item.type] ?? undefined);

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
        <div className="flex items-center justify-between gap-3 rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-sm">
            <div className="flex min-w-0 items-center gap-2">
                <Badge label={typeLabel} tone={tone} icon={badgeIcon} />
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
                        <IconBtn label={`Edit ${item.title}`} onClick={() => { }}>
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

// ─── Collapsible content group ────────────────────────────────────────────────

function ContentGroup({
    label,
    icon: Icon,
    count,
    accentClass,
    emptyText,
    onAdd,
    children,
}: {
    label: string;
    icon: React.ElementType;
    count: number;
    accentClass: string;   // tailwind colour classes for the header stripe
    emptyText: string;
    onAdd: () => void;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0">
            {/* Group header */}
            <div className={cn('flex items-center justify-between px-3 py-2', accentClass)}>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex min-w-0 items-center gap-2 text-left"
                    aria-expanded={open}
                >
                    {open
                        ? <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                        : <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                    }
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold leading-none">
                        {count}
                    </span>
                </button>

                {/* Add button lives on the group header */}
                <button
                    type="button"
                    onClick={onAdd}
                    className="flex items-center gap-1 rounded-md bg-white/60 px-2 py-0.5 text-xs font-medium transition hover:bg-white"
                    aria-label={`Add ${label.toLowerCase()}`}
                >
                    <Plus className="size-3" aria-hidden="true" />
                    Add
                </button>
            </div>

            {/* Items list */}
            {open && (
                <div className="flex flex-col gap-1.5 p-2">
                    {count === 0 ? (
                        <p className="py-3 text-center text-xs text-ink-400">{emptyText}</p>
                    ) : (
                        children
                    )}
                </div>
            )}
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

    // Split items by type
    const resources = module.items.filter((i) => i.item_type === 'resource');
    const assignments = module.items.filter((i) => i.item_type === 'assignment');
    const evaluations = module.items.filter((i) => i.item_type === 'evaluation');

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
                        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-blue-600/10 text-xs font-semibold text-blue-600">
                            {index + 1}
                        </span>
                        <span className="text-sm font-medium text-ink-900">{module.title}</span>
                        {/* Mini summary chips */}
                        <span className="flex items-center gap-1">
                            {resources.length > 0 && (
                                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                    {resources.length}R
                                </span>
                            )}
                            {assignments.length > 0 && (
                                <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
                                    {assignments.length}A
                                </span>
                            )}
                            {evaluations.length > 0 && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                    {evaluations.length}E
                                </span>
                            )}
                            {module.items.length === 0 && (
                                <span className="text-xs text-ink-400">empty</span>
                            )}
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
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <ActionBtn
                            label="Resource"
                            description="Add a learning resource (video, document, link…)"
                            onClick={() => { setAddingForm('resource'); setIsOpen(true); }}
                            icon={FileEdit}
                            colorClass="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                        />
                        <ActionBtn
                            label="Assignment"
                            description="Add a graded assignment"
                            onClick={() => { setAddingForm('assignment'); setIsOpen(true); }}
                            icon={FileCheck2}
                            colorClass="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300"
                        />
                        <ActionBtn
                            label="Evaluation"
                            description="Add a quiz or evaluation"
                            onClick={() => { setAddingForm('evaluation'); setIsOpen(true); }}
                            icon={ListChecks}
                            colorClass="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                        />
                        <button
                            type="button"
                            onClick={handleDeleteModule}
                            aria-label={`Delete ${module.title}`}
                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                        >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </td>
            </tr>

            {/* ── Expanded content ─────────────────────────────────────── */}
            {isOpen && (
                <tr>
                    <td colSpan={3} className="bg-surface-50 px-4 pb-4 pt-1">
                        <div className="flex flex-col gap-2">

                            {/* Resources group */}
                            <ContentGroup
                                label="Resources"
                                icon={FileEdit}
                                count={resources.length}
                                accentClass="bg-blue-50 text-blue-700"
                                emptyText="No resources yet — click Add to get started."
                                onAdd={() => setAddingForm('resource')}
                            >
                                {resources.map((item) => (
                                    <ItemRow
                                        key={`resource-${item.id}`}
                                        item={item}
                                        onDelete={() => deleteItem(item)}
                                    />
                                ))}
                            </ContentGroup>

                            {/* Assignments group */}
                            <ContentGroup
                                label="Assignments"
                                icon={FileCheck2}
                                count={assignments.length}
                                accentClass="bg-violet-50 text-violet-700"
                                emptyText="No assignments yet — click Add to get started."
                                onAdd={() => setAddingForm('assignment')}
                            >
                                {assignments.map((item) => (
                                    <ItemRow
                                        key={`assignment-${item.id}`}
                                        item={item}
                                        onDelete={() => deleteItem(item)}
                                    />
                                ))}
                            </ContentGroup>

                            {/* Evaluations group */}
                            <ContentGroup
                                label="Evaluations"
                                icon={ListChecks}
                                count={evaluations.length}
                                accentClass="bg-emerald-50 text-emerald-700"
                                emptyText="No evaluations yet — click Add to get started."
                                onAdd={() => setAddingForm('evaluation')}
                            >
                                {evaluations.map((item) => (
                                    <ItemRow
                                        key={`evaluation-${item.id}`}
                                        item={item}
                                        onDelete={() => deleteItem(item)}
                                    />
                                ))}
                            </ContentGroup>

                        </div>
                    </td>
                </tr>
            )}

            {/* ── Add-content modals ────────────────────────────────────── */}
            <Modal isOpen={addingForm === 'resource'} onClose={() => setAddingForm(null)} title={module.title} className="max-w-2xl" bodyClassName="p-0">
                <ResourceForm onSubmit={handleCreateResource} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'assignment'} onClose={() => setAddingForm(null)} title={module.title} bodyClassName="p-0">
                <AssignmentQuickForm onSubmit={handleCreateAssignment} onCancel={() => setAddingForm(null)} />
            </Modal>
            <Modal isOpen={addingForm === 'evaluation'} onClose={() => setAddingForm(null)} title={module.title} bodyClassName="p-0">
                <EvaluationQuickForm onSubmit={handleCreateEvaluation} onCancel={() => setAddingForm(null)} />
            </Modal>
        </>
    );
}
