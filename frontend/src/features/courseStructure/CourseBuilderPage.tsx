import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, BookOpen, ClipboardList, MessageCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCreateModule, useDeleteModule, useModules, useUpdateModule } from '@/features/courseStructure/useCourseStructure';
import { updateModule } from '@/features/courseStructure/api';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import type { Module } from '@/lib/api/types';
import { ModuleTableRow, type ModuleReorderProps } from '@/features/courseStructure/ModuleTableRow';
import { TrashedModulesSection } from '@/features/courseStructure/TrashedModulesSection';
import { useCourseAnalytics } from '@/features/analytics/useAnalytics';
import { AtRiskStudentsTable } from '@/features/analytics/AtRiskStudentsTable';
import { EnrollmentTable } from '@/features/analytics/EnrollmentTable';
import { CourseCohortsPanel } from '@/features/cohorts/CourseCohortsPanel';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';

/**
 * Course builder: Analytics stat cards at the top, then tabbed view —
 * Modules tab (module management table), Cohorts tab (read-only: which cohorts this course
 * is offered in — attach/detach happens from the cohort's own page), Analytics tab
 * (enrollment + at-risk). All pulling from one useCourseAnalytics() call.
 */
export function CourseBuilderPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { data: modules, isLoading } = useModules(courseId);
    const { data: analytics, isLoading: isLoadingAnalytics } = useCourseAnalytics(courseId);
    const createModule = useCreateModule(courseId);
    const updateModuleMutation = useUpdateModule(courseId);
    const deleteModule = useDeleteModule(courseId);
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'modules' | 'cohorts' | 'analytics'>('modules');

    // One modal for both creating and editing a module.
    const [moduleForm, setModuleForm] = useState<{ mode: 'create' } | { mode: 'edit'; module: Module } | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledStartAt, setScheduledStartAt] = useState('');
    const [position, setPosition] = useState(0);
    const [formError, setFormError] = useState<string | null>(null);

    // Reordering: an optimistic id order shown while the new positions save.
    const [optimisticOrder, setOptimisticOrder] = useState<number[] | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [reorderError, setReorderError] = useState<string | null>(null);
    const [armedId, setArmedId] = useState<number | null>(null);
    const [dragId, setDragId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);

    const byPosition = modules?.slice().sort((a, b) => a.order_index - b.order_index) ?? [];
    const sortedModules = optimisticOrder
        ? optimisticOrder.map((id) => byPosition.find((m) => m.id === id)).filter((m): m is Module => Boolean(m))
        : byPosition;

    const openCreate = () => {
        setTitle('');
        setDescription('');
        setScheduledStartAt('');
        setFormError(null);
        setModuleForm({ mode: 'create' });
    };

    const openEdit = (module: Module, index: number) => {
        setTitle(module.title);
        setDescription(module.description ?? '');
        setScheduledStartAt(module.scheduled_start_at ? module.scheduled_start_at.slice(0, 10) : '');
        setPosition(index);
        setFormError(null);
        setModuleForm({ mode: 'edit', module });
    };

    /**
     * Moves a module from one position to another and saves the new order. There is no bulk
     * reorder endpoint, so only modules whose order_index actually changes are PATCHed (a swap
     * of neighbours is two requests). Positions keep the course's existing numbering base.
     */
    const moveModule = async (from: number, to: number) => {
        if (from === to || to < 0 || to >= sortedModules.length) return;

        const next = sortedModules.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);

        const base = Math.min(...byPosition.map((m) => m.order_index));
        const changes = next
            .map((m, i) => ({ id: m.id, order_index: base + i }))
            .filter(({ id, order_index }) => byPosition.find((m) => m.id === id)?.order_index !== order_index);

        setReorderError(null);
        setOptimisticOrder(next.map((m) => m.id));
        setIsReordering(true);
        try {
            await Promise.all(changes.map(({ id, order_index }) => updateModule(id, { order_index })));
            await queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] });
        } catch {
            setReorderError('Could not save the new module order. Please try again.');
        } finally {
            setOptimisticOrder(null);
            setIsReordering(false);
        }
    };

    const handleSubmitModule = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        const payload = {
            title,
            description: description || undefined,
            scheduled_start_at: scheduledStartAt || null,
        };

        try {
            if (moduleForm?.mode === 'edit') {
                const currentIndex = sortedModules.findIndex((m) => m.id === moduleForm.module.id);
                await updateModuleMutation.mutateAsync({ moduleId: moduleForm.module.id, payload });
                setModuleForm(null);
                if (currentIndex !== -1 && position !== currentIndex) {
                    await moveModule(currentIndex, position);
                }
            } else {
                await createModule.mutateAsync(payload);
                setModuleForm(null);
            }
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Could not save this module. Please try again.');
        }
    };

    // Drag-and-drop wiring handed to each row.
    const reorderPropsFor = (module: Module, index: number): ModuleReorderProps => ({
        rowProps: {
            draggable: armedId === module.id && !isReordering,
            onDragStart: (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(module.id));
                setDragId(module.id);
            },
            onDragOver: (e) => {
                if (dragId === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overId !== module.id) setOverId(module.id);
            },
            onDrop: (e) => {
                e.preventDefault();
                const from = sortedModules.findIndex((m) => m.id === dragId);
                setDragId(null);
                setOverId(null);
                setArmedId(null);
                if (from !== -1) void moveModule(from, index);
            },
            onDragEnd: () => {
                setDragId(null);
                setOverId(null);
                setArmedId(null);
            },
        },
        onHandlePointerDown: () => setArmedId(module.id),
        onMove: (direction) => void moveModule(index, index + direction),
        isDragging: dragId === module.id,
        isDropTarget: overId === module.id && dragId !== null && dragId !== module.id,
        canMoveUp: index > 0 && !isReordering,
        canMoveDown: index < sortedModules.length - 1 && !isReordering,
    });

    return (
        <div className="mx-auto max-w-7xl space-y-6">

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/courses"
                        className="flex items-center gap-1 text-sm text-ink-600 hover:text-blue-600"
                    >
                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                        Courses
                    </Link>
                    <span className="text-ink-300" aria-hidden="true">/</span>
                    <h1 className="text-base font-semibold text-ink-900">
                        {course?.title ?? '…'}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Link to={`/courses/${courseId}/forum`}>
                        <Button variant="secondary" size="sm">
                            <MessageCircle className="size-3.5" aria-hidden="true" />
                            Forum
                        </Button>
                    </Link>
                    <Link to={`/admin/courses/${courseId}/gradebook`}>
                        <Button variant="secondary" size="sm">
                            <ClipboardList className="size-3.5" aria-hidden="true" />
                            Gradebook
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Analytics stat strip ─────────────────────────────────────── */}
            {isLoadingAnalytics && <Spinner />}

            {analytics && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatWidget
                        icon={Users}
                        label="Enrolled students"
                        value={analytics.total_students}
                        tone="progress"
                    />
                    <StatWidget
                        icon={TrendingUp}
                        label="Completion rate"
                        value={`${analytics.completion_rate}%`}
                        sub={`${analytics.completed_students} of ${analytics.total_students} completed`}
                        tone="success"
                    />
                    <StatWidget
                        icon={AlertTriangle}
                        label="At-risk students"
                        value={analytics.at_risk_students.length}
                        tone="danger"
                    />
                </div>
            )}

            {/* Tabs */}
            <SegmentedTabs
                label="Course sections"
                className="mb-4 mt-6"
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { value: 'modules', label: 'Modules' },
                    { value: 'cohorts', label: 'Cohorts' },
                    { value: 'analytics', label: 'Analytics' },
                ]}
            />

            {/* Modules Tab */}
            {activeTab === 'modules' && (
                <>
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-ink-900">Module management</h2>
                                <p className="text-xs text-ink-600" aria-live="polite">
                                    {sortedModules.length} module{sortedModules.length !== 1 ? 's' : ''}
                                    {isReordering ? ' · Saving new order…' : sortedModules.length > 1 ? ' · Drag ⋮⋮ to reorder' : ''}
                                </p>
                            </div>
                            <Button size="sm" onClick={openCreate}>
                                <Plus className="size-3.5" aria-hidden="true" />
                                New module
                            </Button>
                        </div>

                        {reorderError && (
                            <div className="px-4 pt-3">
                                <Alert variant="error" message={reorderError} onDismiss={() => setReorderError(null)} />
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex justify-center py-10"><Spinner /></div>
                        )}

                        {!isLoading && sortedModules.length === 0 && (
                            <EmptyState
                                icon={BookOpen}
                                title="No modules yet"
                                description="Add your first module to start building this course."
                                className="py-10"
                            />
                        )}

                        {!isLoading && sortedModules.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-surface-100 bg-surface-50">
                                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Module</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">Status</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-ink-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {sortedModules.map((module, index) => (
                                            <ModuleTableRow
                                                key={module.id}
                                                index={index}
                                                module={module}
                                                courseId={courseId}
                                                onDelete={() => deleteModule.mutate(module.id)}
                                                onEdit={() => openEdit(module, index)}
                                                reorder={reorderPropsFor(module, index)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <TrashedModulesSection courseId={courseId} />
                </>
            )}

            {/* Cohorts Tab */}
            {activeTab === 'cohorts' && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm p-4">
                    <CourseCohortsPanel courseId={courseId} />
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
                <div className="flex flex-col gap-6">
                    <EnrollmentTable roster={analytics.roster} />
                    <AtRiskStudentsTable courseId={courseId} students={analytics.at_risk_students} />
                </div>
            )}

            {/* ── New / edit module modal ──────────────────────────────────── */}
            <Modal
                isOpen={moduleForm !== null}
                onClose={() => setModuleForm(null)}
                title={moduleForm?.mode === 'edit' ? 'Edit module' : 'New module'}
            >
                <form onSubmit={handleSubmitModule} className="flex flex-col gap-3">
                    {formError && <Alert variant="error" message={formError} />}
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <Textarea
                        label="Description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <Input
                        label="Opens on (leave blank to unlock sequentially)"
                        type="date"
                        value={scheduledStartAt}
                        onChange={(e) => setScheduledStartAt(e.target.value)}
                    />
                    {moduleForm?.mode === 'edit' && sortedModules.length > 1 && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="module-position" className="text-sm font-medium text-ink-900">Position</label>
                            <select
                                id="module-position"
                                value={position}
                                onChange={(e) => setPosition(Number(e.target.value))}
                                className="rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 shadow-sm focus-visible:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                {sortedModules.map((m, i) => (
                                    <option key={m.id} value={i}>
                                        {i + 1}. {m.id === moduleForm.module.id ? `${m.title} (current)` : m.title}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-ink-600">
                                Students unlock modules in this order, so moving a module changes what they can open next.
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button type="submit" isLoading={createModule.isPending || updateModuleMutation.isPending}>
                            {moduleForm?.mode === 'edit' ? 'Save changes' : 'Create module'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setModuleForm(null)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
