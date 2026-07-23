import { Link, useParams } from 'react-router';
import { CheckCircle2, ChevronRight, Circle, Lock, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCoursePlayer } from '@/features/learning/useLearning';
import { cn } from '@/lib/utils';
import type { ModuleItem, ModuleProgressStatus } from '@/lib/api/types';

function itemLinkFor(item: ModuleItem, courseId: number): string {
    if (item.item_type === 'assignment') {
        return `/learn/assignments/${item.id}?course=${courseId}`;
    }

    if (item.item_type === 'evaluation') {
        return `/learn/evaluations/${item.id}?course=${courseId}`;
    }

    return `/learn/resources/${item.id}?course=${courseId}`;
}

const statusDisplay: Record<
    ModuleProgressStatus,
    { label: string; tone: 'success' | 'progress' | 'neutral'; icon: typeof Lock }
> = {
    locked: { label: 'Locked', tone: 'neutral', icon: Lock },
    not_started: { label: 'Not started', tone: 'neutral', icon: Circle },
    in_progress: { label: 'In progress', tone: 'progress', icon: Circle },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
};

/**
 * FR-13/FR-14: locked modules are shown dimmed, never hidden (ui-context.md §6) — a student
 * sees the shape of the whole course even before a module unlocks.
 */
export function CoursePlayerPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { modules, progress } = useCoursePlayer(courseId);

    if (modules.isLoading || progress.isLoading) {
        return <Spinner />;
    }

    const statusFor = (moduleId: number): ModuleProgressStatus =>
        progress.data?.find((p) => p.module_id === moduleId)?.status ?? 'locked';

    const sortedModules = (modules.data ?? []).slice().sort((a, b) => a.order_index - b.order_index);

    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">{course?.title}</h1>
                <Link to={`/courses/${courseId}/forum`}>
                    <Button variant="secondary">
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Forum
                    </Button>
                </Link>
            </div>

            <div className="mt-6 flex flex-col gap-3">
                {sortedModules.map((module) => {
                    const status = statusFor(module.id);
                    const display = statusDisplay[status];
                    const isLocked = status === 'locked';

                    return (
                        <Card key={module.id} className={cn(isLocked && 'opacity-60')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg">{module.title}</h3>
                                        <Badge label={display.label} tone={display.tone} icon={display.icon} />
                                    </div>
                                    {module.description && (
                                        <p className="mt-1 text-sm text-ink-600">{module.description}</p>
                                    )}
                                </div>
                            </div>

                            {!isLocked && (
                                <ul className="mt-3 flex flex-col gap-1 border-t border-surface-100 pt-3">
                                    {module.items.map((item) => (
                                        <li key={`${item.item_type}-${item.id}`}>
                                            <Link
                                                to={itemLinkFor(item, courseId)}
                                                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-50"
                                            >
                                                <span className="flex items-center gap-2 text-sm text-ink-900">
                                                    {item.is_complete ? (
                                                        <CheckCircle2
                                                            className="size-4 text-success-600"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Circle className="size-4 text-ink-300" aria-hidden="true" />
                                                    )}
                                                    {item.title}
                                                    {item.item_type === 'assignment' && item.due_at && (
                                                        <span className="text-xs text-ink-600">
                                                            Due {new Date(item.due_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {item.item_type === 'evaluation' && (
                                                        <span className="text-xs text-ink-600">
                                                            Pass {item.pass_score}%
                                                        </span>
                                                    )}
                                                    {!item.is_required && (
                                                        <span className="text-xs text-ink-600">(optional)</span>
                                                    )}
                                                </span>
                                                <ChevronRight className="size-4 text-ink-300" aria-hidden="true" />
                                            </Link>
                                        </li>
                                    ))}
                                    {module.items.length === 0 && (
                                        <p className="px-2 text-sm text-ink-600">No content in this module yet.</p>
                                    )}
                                </ul>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
