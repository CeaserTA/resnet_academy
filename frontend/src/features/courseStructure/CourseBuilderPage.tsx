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
import { SectionsManagePage } from '@/features/sections/SectionsManagePage';
import { useUsers } from '@/features/admin/users/useAdminUsers';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';

/**
 * Course builder: Analytics stat cards at the top, then tabbed view —
 * Modules tab (module management table), Sections tab (cohort management),
 * Analytics tab (enrollment + at-risk). All pulling from one useCourseAnalytics() call.
 */
export function CourseBuilderPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { data: modules, isLoading } = useModules(courseId);
    const { data: analytics, isLoading: isLoadingAnalytics } = useCourseAnalytics(courseId);
    const { data: instructors = [] } = useUsers('instructor');
    const createModule = useCreateModule(courseId);
    const deleteModule = useDeleteModule(courseId);

    const [activeTab, setActiveTab] = useState<'modules' | 'sections' | 'analytics'>('modules');
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

            {/* Tabs */}
            <div className="mt-6 flex gap-4 border-b border-surface-100">
                <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'modules'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-ink-600 hover:text-ink-900'
                    }`}
                >
                    Modules
                </button>
                <button
                    onClick={() => setActiveTab('sections')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'sections'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-ink-600 hover:text-ink-900'
                    }`}
                >
                    Sections
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'analytics'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-ink-600 hover:text-ink-900'
                    }`}
                >
                    Analytics
                </button>
            </div>

            {/* Modules Tab */}
            {activeTab === 'modules' && (
                <>
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
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

            {/* Sections Tab */}
            {activeTab === 'sections' && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm p-4">
                    <SectionsManagePage
                        courseId={courseId}
                        instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
                    />
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
                <div className="flex flex-col gap-6">
                    <EnrollmentTable roster={analytics.roster} />
                    <AtRiskStudentsTable courseId={courseId} students={analytics.at_risk_students} />
                </div>
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
