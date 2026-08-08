import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Circle,
    Lock,
    MessageCircle,
    Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCoursePlayer } from '@/features/learning/useLearning';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { useMyReviews } from '@/features/reviews/useReviews';
import { describeLockedModule, findNextIncompleteItem, flattenModuleItems, itemLinkFor } from '@/lib/courseSequence';
import { assignmentDueBadge } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { Module, ModuleProgressStatus } from '@/lib/api/types';

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
    const { data: progressRows } = useProgressDashboard();
    const { data: myReviews } = useMyReviews();
    const [manualToggles, setManualToggles] = useState<Record<number, boolean>>({});
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    if (modules.isLoading || progress.isLoading) {
        return <Spinner />;
    }

    const statusFor = (moduleId: number): ModuleProgressStatus =>
        progress.data?.find((p) => p.module_id === moduleId)?.status ?? 'locked';

    const sortedModules = (modules.data ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    const progressByModuleId = new Map((progress.data ?? []).map((entry) => [entry.module_id, entry]));
    const nextIncompleteItem = findNextIncompleteItem(flattenModuleItems(modules.data ?? []));
    const progressRow = progressRows?.find((row) => row.course.id === courseId);
    const overallPercent = progressRow?.percent_complete ?? 0;
    const hasCompletedCourse = !!progressRow?.certificate;
    const myReview = myReviews?.find((review) => review.course?.id === courseId);

    const nextIncompleteModuleId = sortedModules.find((module) =>
        module.items.some(
            (item) => nextIncompleteItem && item.item_type === nextIncompleteItem.item_type && item.id === nextIncompleteItem.id,
        ),
    )?.id;

    function actionForModule(module: Module, status: ModuleProgressStatus): { label: string; item: ReturnType<typeof findNextIncompleteItem> } {
        const items = flattenModuleItems([module]);

        if (status === 'completed') {
            return { label: 'Review', item: items[0] ?? null };
        }

        return { label: 'Start Module', item: findNextIncompleteItem(items) ?? items[0] ?? null };
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Breadcrumbs items={[{ label: 'My Courses', to: '/dashboard' }, { label: course?.title ?? '' }]} />

            <div className="mt-2 flex items-center justify-between gap-4">
                <h1 className="text-2xl">{course?.title}</h1>
                <div className="flex items-center gap-3">
                    <Link to={`/courses/${courseId}/forum`}>
                        <Button variant="secondary">
                            <MessageCircle className="size-4" aria-hidden="true" />
                            Forum
                        </Button>
                    </Link>
                    {sortedModules.length > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-surface-100 bg-surface-0 px-4 py-2.5">
                            <div>
                                <p className="text-xs text-ink-600">Overall Progress</p>
                                <p className="text-xl font-medium text-ink-900">{Math.round(overallPercent)}%</p>
                            </div>
                            <CircularProgress percent={overallPercent} size={44} showLabel={false} />
                        </div>
                    )}
                </div>
            </div>

            {nextIncompleteItem ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-blue-600/30 bg-blue-50 p-4">
                    <div className="min-w-0">
                        <p className="text-sm text-blue-600">Continue where you left off</p>
                        <p className="truncate font-medium text-ink-900">{nextIncompleteItem.title}</p>
                    </div>
                    <Link to={itemLinkFor(nextIncompleteItem, courseId)}>
                        <Button>
                            Continue
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>
                </div>
            ) : sortedModules.length > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <Alert variant="success" message="You've completed this course!" className="flex-1" />
                    {hasCompletedCourse && !myReview && (
                        <Button variant="secondary" onClick={() => setIsReviewModalOpen(true)} className="shrink-0">
                            <Star className="size-4" aria-hidden="true" />
                            Rate & Review this course
                        </Button>
                    )}
                </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
                {sortedModules.map((module, index) => {
                    const status = statusFor(module.id);
                    const display = statusDisplay[status];
                    const isLocked = status === 'locked';
                    const lockedReason = isLocked ? describeLockedModule(module, sortedModules, progressByModuleId) : null;
                    const isExpanded = manualToggles[module.id] ?? module.id === nextIncompleteModuleId;
                    const action = actionForModule(module, status);

                    return (
                        <Card
                            key={module.id}
                            className={cn(
                                'relative',
                                isLocked && 'opacity-60',
                                status === 'in_progress' && 'border-blue-600 ring-1 ring-blue-600/20',
                            )}
                        >
                            <div
                                className={cn(
                                    'absolute -left-4 top-5 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ring-4 ring-surface-50',
                                    status === 'completed' && 'bg-success-600 text-white',
                                    status === 'in_progress' && 'bg-blue-600 text-white',
                                    (status === 'not_started' || status === 'locked') && 'bg-surface-100 text-ink-600',
                                )}
                            >
                                {status === 'completed' ? (
                                    <CheckCircle2 className="size-5" aria-hidden="true" />
                                ) : isLocked ? (
                                    <Lock className="size-4" aria-hidden="true" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            <div className="flex items-center gap-4 pl-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge label={display.label.toUpperCase()} tone={display.tone} icon={display.icon} />
                                        <span className="text-xs text-ink-600">
                                            Module {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <h3 className="mt-1 text-lg">{module.title}</h3>
                                    {module.description && (
                                        <p className="mt-1 text-sm text-ink-600">{module.description}</p>
                                    )}
                                    {lockedReason && <p className="mt-1 text-sm text-ink-600">{lockedReason}</p>}
                                </div>

                                {!isLocked && action.item ? (
                                    <Link to={itemLinkFor(action.item, courseId)} className="shrink-0">
                                        <Button variant={status === 'completed' ? 'secondary' : 'primary'}>
                                            {action.label}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="ghost" disabled className="shrink-0">
                                        Locked
                                    </Button>
                                )}
                            </div>

                            {!isLocked && module.items.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setManualToggles((prev) => ({ ...prev, [module.id]: !isExpanded }))}
                                        className="mt-3 flex items-center gap-1 border-t border-surface-100 pt-3 text-sm font-medium text-blue-600"
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="size-4" aria-hidden="true" />
                                        ) : (
                                            <ChevronDown className="size-4" aria-hidden="true" />
                                        )}
                                        View {module.items.length} Resource{module.items.length === 1 ? '' : 's'}
                                    </button>

                                    {isExpanded && (
                                        <ul className="mt-1 flex flex-col gap-2">
                                            {module.items.map((item) => (
                                                <li key={`${item.item_type}-${item.id}`}>
                                                    <Link
                                                        to={itemLinkFor(item, courseId)}
                                                        className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2.5 hover:bg-surface-100"
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
                                                            {item.item_type === 'assignment' && item.due_at && (() => {
                                                                const urgency = assignmentDueBadge(item.due_at, item.is_complete);

                                                                return urgency ? (
                                                                    <Badge label={urgency.label} tone={urgency.tone} icon={urgency.icon} />
                                                                ) : (
                                                                    <span className="text-xs text-ink-600">
                                                                        Due {new Date(item.due_at).toLocaleDateString()}
                                                                    </span>
                                                                );
                                                            })()}
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
                                        </ul>
                                    )}
                                </>
                            )}
                        </Card>
                    );
                })}
            </div>

            {isReviewModalOpen && course && (
                <ReviewFormModal course={course} onClose={() => setIsReviewModalOpen(false)} />
            )}
        </div>
    );
}
