import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, BookOpen, ClipboardList, MessageCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { StatWidget } from '@/components/dashboard/StatWidget';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCreateModule, useDeleteModule, useModules } from '@/features/courseStructure/useCourseStructure';
import { ModuleTableRow } from '@/features/courseStructure/ModuleTableRow';
import { TrashedModulesSection } from '@/features/courseStructure/TrashedModulesSection';
import { useCourseAnalytics } from '@/features/analytics/useAnalytics';
import { AtRiskStudentsTable } from '@/features/analytics/AtRiskStudentsTable';
import { EnrollmentTable } from '@/features/analytics/EnrollmentTable';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';

export function CourseBuilderPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { data: modules, isLoading } = useModules(courseId);
    const { data: analytics, isLoading: isLoadingAnalytics } = useCourseAnalytics(courseId);
    const createModule = useCreateModule(courseId);
    const deleteModule = useDeleteModule(courseId);

    const [isAddingModule, setIsAddingModule] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledStartAt, setScheduledStartAt] = useState('');

    const handleCreateModule = async (e: React.FormEvent) => {
        e.preventDefault();
        await createModule.mutateAsync({
            title,
            description: description || undefined,
            scheduled_start_at: scheduledStartAt || null,
        });
        setTitle('');
        setDescription('');
        setScheduledStartAt('');
        setIsAddingModule(false);
    };

    const sortedModules = modules?.slice().sort((a, b) => a.order_index - b.order_index) ?? [];

    return (
        <div className="mx-auto max-w-7xl space-y-6">

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/courses"
                        className="flex items-center gap-1 text-sm text-ink-400 hover:text-blue-600"
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

            {/* ── Module management ─────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-ink-900">Module management</h2>
                        <p className="text-xs text-ink-400">
                            {sortedModules.length} module{sortedModules.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setIsAddingModule(true)}>
                        <Plus className="size-3.5" aria-hidden="true" />
                        New module
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex justify-center py-10">
                        <Spinner />
                    </div>
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
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">
                                        Module
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-600">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-ink-600">
                                        Actions
                                    </th>
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
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Recently deleted ─────────────────────────────────────────── */}
            <TrashedModulesSection courseId={courseId} />

            {/* ── Enrollment + At-risk ─────────────────────────────────────── */}
            {analytics && (
                <>
                    <EnrollmentTable roster={analytics.roster} />
                    <AtRiskStudentsTable courseId={courseId} students={analytics.at_risk_students} />
                </>
            )}

            {/* ── New module modal ─────────────────────────────────────────── */}
            <Modal isOpen={isAddingModule} onClose={() => setIsAddingModule(false)} title="New module">
                <form onSubmit={handleCreateModule} className="flex flex-col gap-3">
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
                    <div className="flex gap-2">
                        <Button type="submit" isLoading={createModule.isPending}>
                            Create module
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setIsAddingModule(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
