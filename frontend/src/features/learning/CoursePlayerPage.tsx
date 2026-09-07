import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Circle,
    FileCheck2,
    ListChecks,
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
import {
    describeLockedModule,
    findNextIncompleteItem,
    findNextIncompleteItemInUnlockedModules,
    flattenModuleItems,
    isCourseCompleted,
    itemLinkFor,
} from '@/lib/courseSequence';
import { assignmentDueBadge } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type {
    AssignmentModuleItem,
    EvaluationModuleItem,
    Module,
    ModuleItem,
    ModuleProgressStatus,
    ResourceModuleItem,
} from '@/lib/api/types';

// ─── Status display map ───────────────────────────────────────────────────────

const statusDisplay: Record<
    ModuleProgressStatus,
    { label: string; tone: 'success' | 'progress' | 'neutral'; icon: typeof Lock }
> = {
    locked: { label: 'Locked', tone: 'neutral', icon: Lock },
    not_started: { label: 'Not started', tone: 'neutral', icon: Circle },
    in_progress: { label: 'In progress', tone: 'progress', icon: Circle },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
};

// ─── Resource type labels ──────────────────────────────────────────────────────

const resourceTypeLabel: Record<string, string> = {
    video: 'Video',
    document: 'Document',
    reading: 'Reading',
    external_link: 'Link',
    scorm: 'SCORM',
    live_session: 'Live session',
    downloadable_file: 'Download',
};

// ─── Single item row ──────────────────────────────────────────────────────────

function ItemRow({ item, courseId }: { item: ModuleItem; courseId: number }) {
    const isComplete = item.is_complete;

    return (
        <li>
            <Link
                to={itemLinkFor(item, courseId)}
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-surface-100 transition hover:bg-surface-50 hover:ring-blue-200"
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    {/* Completion indicator */}
                    {isComplete ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success-600" aria-hidden="true" />
                    ) : (
                        <Circle className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                    )}

                    <span className="truncate text-sm font-medium text-ink-900">{item.title}</span>

                    {/* Resource type chip */}
                    {item.item_type === 'resource' && (
                        <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                            {resourceTypeLabel[(item as ResourceModuleItem).type] ?? (item as ResourceModuleItem).type}
                        </span>
                    )}

                    {/* Assignment: due date */}
                    {item.item_type === 'assignment' && (item as AssignmentModuleItem).due_at && (() => {
                        const a = item as AssignmentModuleItem;
                        const urgency = assignmentDueBadge(a.due_at!, a.is_complete);
                        return urgency ? (
                            <Badge label={urgency.label} tone={urgency.tone} icon={urgency.icon} />
                        ) : (
                            <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                                Due {new Date(a.due_at!).toLocaleDateString()}
                            </span>
                        );
                    })()}

                    {/* Assignment: score if graded */}
                    {item.item_type === 'assignment' &&
                        (item as AssignmentModuleItem).my_submission?.final_score !== null &&
                        (item as AssignmentModuleItem).my_submission !== null && (
                            <span className="shrink-0 text-xs font-semibold text-success-600">
                                {(item as AssignmentModuleItem).my_submission!.final_score} / {(item as AssignmentModuleItem).max_score}
                            </span>
                        )}

                    {/* Evaluation: pass score + best attempt */}
                    {item.item_type === 'evaluation' && (
                        <>
                            <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                                Pass {(item as EvaluationModuleItem).pass_score}%
                            </span>
                            {(item as EvaluationModuleItem).my_best_attempt && (
                                <span className={cn(
                                    'shrink-0 text-xs font-semibold',
                                    (item as EvaluationModuleItem).my_best_attempt!.passed
                                        ? 'text-success-600'
                                        : 'text-danger-600',
                                )}>
                                    {(item as EvaluationModuleItem).my_best_attempt!.score_percent}%
                                </span>
                            )}
                        </>
                    )}

                    {!item.is_required && (
                        <span className="shrink-0 text-xs text-ink-300">(optional)</span>
                    )}
                </span>

                <ChevronRight className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
            </Link>
        </li>
    );
}

// ─── Collapsible item group ───────────────────────────────────────────────────

function ItemGroup({
    label,
    icon: Icon,
    items,
    courseId,
    accentClass,
    defaultOpen = true,
}: {
    label: string;
    icon: React.ElementType;
    items: ModuleItem[];
    courseId: number;
    accentClass: string;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const doneCount = items.filter((i) => i.is_complete).length;

    return (
        <div className="overflow-hidden rounded-xl border border-surface-100">
            {/* Group header */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn('flex w-full items-center justify-between px-3 py-2 text-left', accentClass)}
                aria-expanded={open}
            >
                <span className="flex items-center gap-2">
                    {open
                        ? <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                        : <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                    }
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold leading-none">
                        {items.length}
                    </span>
                </span>

                {/* Completion pill */}
                <span className="text-[10px] font-medium opacity-70">
                    {doneCount}/{items.length} done
                </span>
            </button>

            {/* Item list */}
            {open && (
                <ul className="flex flex-col gap-1.5 bg-surface-50 p-2">
                    {items.map((item) => (
                        <ItemRow
                            key={`${item.item_type}-${item.id}`}
                            item={item}
                            courseId={courseId}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

    const sortedModules = (modules.data ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    const progressByModuleId = new Map((progress.data ?? []).map((entry) => [entry.module_id, entry]));

    const statusFor = (moduleId: number): ModuleProgressStatus =>
        progressByModuleId.get(moduleId)?.status ?? 'locked';

    const nextIncompleteItem = findNextIncompleteItemInUnlockedModules(sortedModules, progressByModuleId);
    const courseCompleted = isCourseCompleted(sortedModules, progressByModuleId);

    const progressRow = progressRows?.find((row) => row.course.id === courseId);
    const overallPercent = progressRow?.percent_complete ?? 0;
    const hasCompletedCourse = !!progressRow?.certificate;
    const myReview = myReviews?.find((review) => review.course?.id === courseId);

    function isDefaultExpanded(moduleId: number): boolean {
        const s = statusFor(moduleId);
        return s === 'not_started' || s === 'in_progress';
    }

    function isExpanded(moduleId: number): boolean {
        return manualToggles[moduleId] ?? isDefaultExpanded(moduleId);
    }

    function actionForModule(module: Module, status: ModuleProgressStatus): {
        label: string;
        item: ReturnType<typeof findNextIncompleteItem>;
    } {
        const items = flattenModuleItems([module]);
        if (status === 'completed') {
            return { label: 'Review', item: items[0] ?? null };
        }
        return { label: 'Open module', item: findNextIncompleteItem(items) ?? items[0] ?? null };
    }

    return (
        <div className="mx-auto max-w-5xl">
            <Breadcrumbs items={[{ label: 'My Courses', to: '/dashboard' }, { label: course?.title ?? '' }]} />

            {/* Header */}
            <div className="mt-2 flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold">{course?.title}</h1>
                <div className="flex items-center gap-2">
                    <Link to={`/courses/${courseId}/forum`}>
                        <Button variant="secondary" className="text-sm">
                            <MessageCircle className="size-4" aria-hidden="true" />
                            Forum
                        </Button>
                    </Link>
                    {sortedModules.length > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-surface-100 bg-surface-0 px-3 py-2">
                            <div>
                                <p className="text-xs text-ink-600">Progress</p>
                                <p className="text-lg font-semibold text-ink-900">{Math.round(overallPercent)}%</p>
                            </div>
                            <CircularProgress percent={overallPercent} size={36} showLabel={false} />
                        </div>
                    )}
                </div>
            </div>

            {/* Continue / completed banner */}
            {nextIncompleteItem ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-blue-600/30 bg-blue-50 p-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-600">Continue where you left off</p>
                        <p className="truncate text-sm font-medium text-ink-900">{nextIncompleteItem.title}</p>
                    </div>
                    <Link to={itemLinkFor(nextIncompleteItem, courseId)}>
                        <Button size="sm">
                            Continue
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </Link>
                </div>
            ) : courseCompleted ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                    <Alert variant="success" message="You've completed this course!" className="flex-1" />
                    {hasCompletedCourse && !myReview && (
                        <Button variant="secondary" onClick={() => setIsReviewModalOpen(true)} className="shrink-0 text-sm">
                            <Star className="size-4" aria-hidden="true" />
                            Rate & Review
                        </Button>
                    )}
                </div>
            ) : null}

            {/* Module list */}
            <div className="mt-4 flex flex-col gap-3">
                {sortedModules.map((module, index) => {
                    const status = statusFor(module.id);
                    const display = statusDisplay[status];
                    const isLocked = status === 'locked';
                    const lockedReason = isLocked ? describeLockedModule(module, sortedModules, progressByModuleId) : null;
                    const expanded = isExpanded(module.id);
                    const action = actionForModule(module, status);

                    // Split items into three groups
                    const sortedItems = module.items.slice().sort((a, b) => a.order_index - b.order_index);
                    const resources = sortedItems.filter((i) => i.item_type === 'resource');
                    const assignments = sortedItems.filter((i) => i.item_type === 'assignment');
                    const evaluations = sortedItems.filter((i) => i.item_type === 'evaluation');
                    const hasItems = sortedItems.length > 0;

                    return (
                        <Card
                            key={module.id}
                            className={cn(
                                'relative overflow-visible',
                                isLocked && 'opacity-60',
                                status === 'in_progress' && 'border-blue-600 ring-1 ring-blue-600/20',
                            )}
                        >
                            {/* Module number bubble */}
                            <div
                                className={cn(
                                    'absolute -left-3 top-4 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-surface-50',
                                    status === 'completed' && 'bg-success-600 text-white',
                                    status === 'in_progress' && 'bg-blue-600 text-white',
                                    (status === 'not_started' || status === 'locked') && 'bg-surface-100 text-ink-600',
                                )}
                            >
                                {status === 'completed' ? (
                                    <CheckCircle2 className="size-4" aria-hidden="true" />
                                ) : isLocked ? (
                                    <Lock className="size-3.5" aria-hidden="true" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            {/* Module header row */}
                            <div className="flex items-center gap-3 pl-1">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge label={display.label.toUpperCase()} tone={display.tone} icon={display.icon} />
                                        <span className="text-xs text-ink-600">
                                            Module {String(index + 1).padStart(2, '0')}
                                        </span>
                                        {/* Mini count chips when collapsed */}
                                        {!expanded && !isLocked && (
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
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="mt-1 text-base font-semibold">{module.title}</h3>
                                    {module.description && (
                                        <p className={cn('mt-0.5 text-sm text-ink-600', !expanded && 'line-clamp-1')}>
                                            {module.description}
                                        </p>
                                    )}
                                    {lockedReason && (
                                        <p className="mt-1 text-sm text-ink-600">{lockedReason}</p>
                                    )}
                                </div>

                                {/* Action button */}
                                {!isLocked && action.item ? (
                                    <Link to={itemLinkFor(action.item, courseId)} className="shrink-0">
                                        <Button variant={status === 'completed' ? 'secondary' : 'primary'} size="sm">
                                            {action.label}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="ghost" disabled className="shrink-0" size="sm">
                                        Locked
                                    </Button>
                                )}
                            </div>

                            {/* Expand/collapse toggle (only for unlocked modules with items) */}
                            {!isLocked && hasItems && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setManualToggles((prev) => ({ ...prev, [module.id]: !expanded }))
                                        }
                                        className="mt-2 flex w-full items-center justify-between border-t border-surface-100 pt-2 text-xs font-medium text-blue-600"
                                    >
                                        <span className="flex items-center gap-1">
                                            {expanded
                                                ? <ChevronUp className="size-3.5" aria-hidden="true" />
                                                : <ChevronDown className="size-3.5" aria-hidden="true" />
                                            }
                                            {expanded ? 'Hide content' : `Show ${sortedItems.length} item${sortedItems.length !== 1 ? 's' : ''}`}
                                        </span>
                                        <span className="text-ink-400">
                                            {sortedItems.filter((i) => i.is_complete).length}/{sortedItems.length} completed
                                        </span>
                                    </button>

                                    {/* Three collapsible groups */}
                                    {expanded && (
                                        <div className="mt-2 flex flex-col gap-2">
                                            {resources.length > 0 && (
                                                <ItemGroup
                                                    label="Resources"
                                                    icon={BookOpen}
                                                    items={resources}
                                                    courseId={courseId}
                                                    accentClass="bg-blue-50 text-blue-700"
                                                    defaultOpen={true}
                                                />
                                            )}
                                            {assignments.length > 0 && (
                                                <ItemGroup
                                                    label="Assignments"
                                                    icon={FileCheck2}
                                                    items={assignments}
                                                    courseId={courseId}
                                                    accentClass="bg-violet-50 text-violet-700"
                                                    defaultOpen={true}
                                                />
                                            )}
                                            {evaluations.length > 0 && (
                                                <ItemGroup
                                                    label="Evaluations"
                                                    icon={ListChecks}
                                                    items={evaluations}
                                                    courseId={courseId}
                                                    accentClass="bg-emerald-50 text-emerald-700"
                                                    defaultOpen={true}
                                                />
                                            )}
                                        </div>
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
