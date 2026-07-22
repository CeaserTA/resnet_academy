import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, BarChart3, BookOpen, ClipboardList, MessageCircle, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCreateModule, useDeleteModule, useGroups, useModules } from '@/features/courseStructure/useCourseStructure';
import { ModuleCard } from '@/features/courseStructure/ModuleCard';
import { GroupsPanel } from '@/features/courseStructure/GroupsPanel';
import { AnnouncementsPanel } from '@/features/communication/AnnouncementsPanel';

export function CourseBuilderPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { data: modules, isLoading } = useModules(courseId);
    const { data: groups } = useGroups(courseId);
    const createModule = useCreateModule(courseId);
    const deleteModule = useDeleteModule(courseId);

    const [isAddingModule, setIsAddingModule] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledStartAt, setScheduledStartAt] = useState('');
    const [groupIds, setGroupIds] = useState<number[]>([]);

    const handleCreateModule = async (e: React.FormEvent) => {
        e.preventDefault();

        await createModule.mutateAsync({
            title,
            description: description || undefined,
            scheduled_start_at: scheduledStartAt || null,
            group_ids: groupIds,
        });

        setTitle('');
        setDescription('');
        setScheduledStartAt('');
        setGroupIds([]);
        setIsAddingModule(false);
    };

    return (
        <div className="mx-auto max-w-4xl">
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
                    <Link to={`/admin/courses/${courseId}/analytics`}>
                        <Button variant="secondary">
                            <BarChart3 className="size-4" aria-hidden="true" />
                            Analytics
                        </Button>
                    </Link>
                </div>
            </div>

            <h1 className="mt-2 text-2xl">{course?.title ?? 'Course'} — modules</h1>

            <div className="mt-6">
                <AnnouncementsPanel courseId={courseId} />
            </div>

            <div className="mt-6">
                <GroupsPanel courseId={courseId} />
            </div>

            <div className="mt-6 flex items-center justify-between">
                <h2 className="text-lg">Modules</h2>
                {!isAddingModule && (
                    <Button onClick={() => setIsAddingModule(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New module
                    </Button>
                )}
            </div>

            {isAddingModule && (
                <Card className="mt-3">
                    <form onSubmit={handleCreateModule} className="flex flex-col gap-3">
                        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <Textarea
                            label="Description"
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <Input
                            label="Opens on (leave blank to unlock as soon as sequentially reached)"
                            type="date"
                            value={scheduledStartAt}
                            onChange={(e) => setScheduledStartAt(e.target.value)}
                        />

                        {groups && groups.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-ink-900">
                                    Restrict to groups (leave unchecked for everyone)
                                </p>
                                <div className="mt-2 flex flex-col gap-1">
                                    {groups.map((group) => (
                                        <label key={group.id} className="flex items-center gap-2 text-sm text-ink-900">
                                            <input
                                                type="checkbox"
                                                checked={groupIds.includes(group.id)}
                                                onChange={(e) =>
                                                    setGroupIds((prev) =>
                                                        e.target.checked
                                                            ? [...prev, group.id]
                                                            : prev.filter((id) => id !== group.id),
                                                    )
                                                }
                                            />
                                            {group.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button type="submit" isLoading={createModule.isPending}>
                                Create module
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsAddingModule(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="mt-4 flex flex-col gap-4">
                {isLoading && <Spinner />}

                {!isLoading && modules?.length === 0 && (
                    <EmptyState icon={BookOpen} title="No modules yet" description="Add your first module above." />
                )}

                {modules
                    ?.slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((module) => (
                        <ModuleCard
                            key={module.id}
                            module={module}
                            courseId={courseId}
                            onDelete={() => deleteModule.mutate(module.id)}
                        />
                    ))}
            </div>
        </div>
    );
}
