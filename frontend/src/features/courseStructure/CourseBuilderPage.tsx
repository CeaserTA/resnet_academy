import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { AlertTriangle, ArrowLeft, BookOpen, ClipboardList, MessageCircle, Plus, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCreateModule, useDeleteModule, useModules } from '@/features/courseStructure/useCourseStructure';
import { ModuleTableRow } from '@/features/courseStructure/ModuleTableRow';
import { useCourseAnalytics } from '@/features/analytics/useAnalytics';
import { AtRiskStudentsTable } from '@/features/analytics/AtRiskStudentsTable';
import { EnrollmentTable } from '@/features/analytics/EnrollmentTable';

/**
 * Course builder redesign: Course Analytics stat cards stacked vertically at the top, then the
 * Module Management table (adding a module opens a `Modal`), then Student Enrollment, then
 * At-Risk Students — all pulling from one `useCourseAnalytics()` call. Announcements moved to the
 * notification bell (`AnnouncementComposer`) and Groups were dropped from the UI entirely — both
 * confirmed with the user. The standalone `/admin/courses/:id/analytics` page is retired in favor
 * of this.
 */
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
        <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
                <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to courses
                </Link>
                <div className="flex gap-2">
                    <Link to={`/courses/${courseId}/forum`}>
                        <Button variant="secondary">
                            <MessageCircle className="size-4" aria-hidden="true" />
                            Forum
                        </Button>
                    </Link>
                    <Link to={`/admin/courses/${courseId}/gradebook`}>
                        <Button variant="secondary">
                            <ClipboardList className="size-4" aria-hidden="true" />
                            Gradebook
                        </Button>
                    </Link>
                </div>
            </div>

            <h1 className="mt-2 text-2xl">{course?.title ?? 'Course'}</h1>

            <div className="mt-6 flex flex-col gap-3">
                <h2 className="text-lg text-ink-900">Course Analytics</h2>

                {isLoadingAnalytics && <Spinner />}

                {analytics && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatCard icon={Users} label="Enrolled students" value={analytics.total_students} tone="progress" />
                        <StatCard
                            icon={TrendingUp}
                            label="Completion rate"
                            value={`${analytics.completion_rate}%`}
                            sub={`${analytics.completed_students} of ${analytics.total_students} completed`}
                            tone="success"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label="At-risk students"
                            value={analytics.at_risk_students.length}
                            tone="danger"
                        />
                    </div>
                )}
            </div>

            <Card className="mt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg text-ink-900">Module Management</h2>
                    <Button onClick={() => setIsAddingModule(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New Module
                    </Button>
                </div>

                <div className="mt-4">
                    {isLoading && <Spinner />}

                    {!isLoading && sortedModules.length === 0 && (
                        <EmptyState icon={BookOpen} title="No modules yet" description="Add your first module above." />
                    )}

                    {!isLoading && sortedModules.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-surface-100">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-100 text-left">
                                    <tr>
                                        <th className="px-4 py-2 font-medium text-ink-600">Module Name</th>
                                        <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                        <th className="px-4 py-2 text-right font-medium text-ink-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
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
            </Card>

            {analytics && (
                <div className="mt-6 flex flex-col gap-6">
                    <EnrollmentTable roster={analytics.roster} />
                    <AtRiskStudentsTable courseId={courseId} students={analytics.at_risk_students} />
                </div>
            )}

            <Modal isOpen={isAddingModule} onClose={() => setIsAddingModule(false)} title="New module">
                <form onSubmit={handleCreateModule} className="flex flex-col gap-3">
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Input
                        label="Opens on (leave blank to unlock as soon as sequentially reached)"
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
