import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
    ArrowRight,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Circle,
    ClipboardList,
    FileCheck2,
    ListChecks,
    Lock,
    MessageCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useCourse } from '@/features/catalogue/useCourses';
import { useCoursePlayer } from '@/features/learning/useLearning';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { useMyReviews } from '@/features/reviews/useReviews';
import { ReviewStatus } from '@/features/reviews/ReviewStatus';
import {
    describeLockedModule,
    findNextIncompleteItemInUnlockedModules,
    flattenModuleItems,
    isCourseCompleted,
    itemLinkFor,
} from '@/lib/courseSequence';
import { assignmentDueBadge } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import { PageFrame } from '@/components/layout/PageFrame';
import type {
    AssignmentModuleItem,
    EvaluationModuleItem,
    Module,
    ModuleItem,
    ModuleProgressStatus,
    ResourceModuleItem,
} from '@/lib/api/types';
import { formatDate } from '@/lib/formatDate';

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

// ─── Number formatting ────────────────────────────────────────────────────────

/** "70.00" → "70", "72.50" → "72.5" — scores and pass marks without trailing zeros. */
function formatNumber(value: number | string): string {
    return String(Number(Number(value).toFixed(1)));
}

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

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
                        <span className="hidden shrink-0 text-xs text-ink-600 sm:inline">
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
                            <span className="hidden shrink-0 text-xs text-ink-600 sm:inline">
                                Due {formatDate(a.due_at!)}
                            </span>
                        );
                    })()}

                    {/* Assignment: score if graded */}
                    {item.item_type === 'assignment' &&
                        (item as AssignmentModuleItem).my_submission?.final_score !== null &&
                        (item as AssignmentModuleItem).my_submission !== null && (
                            <span className="shrink-0 text-xs font-semibold text-success-600">
                                {formatNumber((item as AssignmentModuleItem).my_submission!.final_score!)} / {formatNumber((item as AssignmentModuleItem).max_score)}
                            </span>
                        )}

                    {/* Evaluation: pass score + best attempt */}
                    {item.item_type === 'evaluation' && (
                        <>
                            <span className="hidden shrink-0 text-xs text-ink-600 sm:inline">
                                Pass mark {formatNumber((item as EvaluationModuleItem).pass_score)}%
                            </span>
                            {(item as EvaluationModuleItem).my_best_attempt && (
                                <span className={cn(
                                    'shrink-0 text-xs font-semibold',
                                    (item as EvaluationModuleItem).my_best_attempt!.passed
                                        ? 'text-success-600'
                                        : 'text-danger-600',
                                )}>
                                    Best score {formatNumber((item as EvaluationModuleItem).my_best_attempt!.score_percent)}%
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
    defaultOpen = true,
}: {
    label: string;
    icon: React.ElementType;
    items: ModuleItem[];
    courseId: number;
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
                className="flex w-full items-center justify-between bg-surface-50 px-3 py-2 text-left text-ink-900"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2">
                    {open
                        ? <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                        : <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                    }
                    <Icon className="size-3.5 shrink-0 text-ink-600" aria-hidden="true" />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-xs text-ink-600">{items.length}</span>
                </span>

                {/* Completion pill */}
                <span className="text-xs text-ink-600">
                    {doneCount}/{items.length} done
                </span>
            </button>

            {/* Item list */}
            {open && (
                <ul className="flex flex-col gap-1.5 border-t border-surface-100 bg-surface-50 p-2">
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
    const { data: myReviews, isSuccess: reviewsLoaded } = useMyReviews();
    const [manualToggles, setManualToggles] = useState<Record<number, boolean>>({});
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'assessments'>('content');

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
    // Set only while the intake has not begun; every module is locked until then.
    const cohortStartsOn = progressRow?.status === 'upcoming' ? progressRow.starts_on : null;
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

    /**
     * Only completed modules get a header-row action ("Review") — for every other unlocked
     * module, the "Show N items" dropdown right below already exposes and links to every
     * resource/assignment/evaluation, so a separate "Open module" button was a redundant second
     * way to do the same navigation.
     */
    function reviewItemForModule(module: Module): ModuleItem | null {
        return flattenModuleItems([module])[0] ?? null;
    }

    // Aggregate all assignments + evaluations across every module for the Assessments tab
    const assessmentModules = sortedModules
        .map((module) => {
            const sortedItems = module.items.slice().sort((a, b) => a.order_index - b.order_index);
            return {
                module,
                assignments: sortedItems.filter((i) => i.item_type === 'assignment'),
                evaluations: sortedItems.filter((i) => i.item_type === 'evaluation'),
            };
        })
        .filter(({ assignments, evaluations }) => assignments.length > 0 || evaluations.length > 0);

    const totalAssessments = assessmentModules.reduce(
        (sum, { assignments, evaluations }) => sum + assignments.length + evaluations.length,
        0,
    );

    return (
        <PageFrame
            breadcrumbs={[{ label: 'My courses', to: '/my-courses' }, { label: course?.title ?? '' }]}
            title={course?.title ?? 'Course'}
            actions={
                <>
                    <Link to={`/courses/${courseId}/forum`}>
                        <Button variant="secondary" className="text-sm">
                            <MessageCircle className="size-4" aria-hidden="true" />
                            Forum
                        </Button>
                    </Link>
                    {sortedModules.length > 0 && (
                        <div className="w-40">
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                                <span className="text-ink-600">Progress</span>
                                <span className="font-semibold text-ink-900">{Math.round(overallPercent)}% complete</span>
                            </div>
                            <ProgressBar percent={overallPercent} className="mt-1" />
                        </div>
                    )}
                </>
            }
        >

            {/* Continue / completed banner */}
            {cohortStartsOn ? (
                /* Every module is locked until the intake begins, so the date leads rather than
                   leaving a page of locked rows with no explanation. */
                <div className="flex items-start gap-3 rounded-lg border border-blue-600/30 bg-blue-50 p-3">
                    <CalendarClock className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">
                            This course starts on{' '}
                            {formatDate(cohortStartsOn)}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-600">
                            Your place is reserved. The modules below open on that date — you can see what the course
                            covers in the meantime.
                        </p>
                    </div>
                </div>
            ) : nextIncompleteItem ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-600/30 bg-blue-50 p-3">
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
                <div className="flex items-center justify-between gap-2">
                    <Alert variant="success" message="You've completed this course!" className="flex-1" />
                    {hasCompletedCourse && (
                        <ReviewStatus review={myReview} isLoaded={reviewsLoaded} onReview={() => setIsReviewModalOpen(true)} />
                    )}
                </div>
            ) : null}

            {/* Tab bar */}
            <div className="flex gap-1 rounded-xl border border-border bg-surface-50 p-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('content')}
                    className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                        activeTab === 'content'
                            ? 'bg-white shadow-sm text-ink-900'
                            : 'text-ink-600 hover:text-ink-900',
                    )}
                >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Content
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('assessments')}
                    className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                        activeTab === 'assessments'
                            ? 'bg-white shadow-sm text-ink-900'
                            : 'text-ink-600 hover:text-ink-900',
                    )}
                >
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Assessments
                    {totalAssessments > 0 && (
                        <span className={cn(
                            'flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                            activeTab === 'assessments'
                                ? 'bg-primary text-white'
                                : 'bg-surface-100 text-ink-600',
                        )}>
                            {totalAssessments}
                        </span>
                    )}
                </button>
            </div>

            {/* Content tab — module list with Resources only inside each card */}
            {activeTab === 'content' && (
                <div className="flex flex-col gap-3">
                    {sortedModules.map((module, index) => {
                        const status = statusFor(module.id);
                        const display = statusDisplay[status];
                        const isLocked = status === 'locked';
                        const lockedReason = isLocked
                            ? describeLockedModule(module, sortedModules, progressByModuleId, cohortStartsOn)
                            : null;
                        const expanded = isExpanded(module.id);
                        const reviewItem = status === 'completed' ? reviewItemForModule(module) : null;

                        // Content tab shows resources only; assignments/evaluations live in Assessments tab
                        const sortedItems = module.items.slice().sort((a, b) => a.order_index - b.order_index);
                        const resources = sortedItems.filter((i) => i.item_type === 'resource');
                        const assessments = sortedItems.filter((i) => i.item_type === 'assignment' || i.item_type === 'evaluation');
                        const hasResources = resources.length > 0;
                        const openCount = sortedItems.filter((i) => !i.is_complete).length;

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
                                    ) : (
                                        index + 1
                                    )}
                                </div>

                                {/* Module header row */}
                                <div className="flex items-center gap-3 pl-1">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="shrink-0"><Badge label={display.label} tone={display.tone} icon={display.icon} /></span>
                                            <span className="shrink-0 text-xs text-ink-600">
                                                Module {String(index + 1).padStart(2, '0')}
                                            </span>
                                            {/* What's inside, spelled out, when collapsed */}
                                            {!expanded && !isLocked && hasResources && (
                                                <span className="hidden truncate text-xs text-ink-600 sm:inline">
                                                    · {plural(resources.length, 'resource')}
                                                    {assessments.length > 0 && ` · ${plural(assessments.length, 'assessment')}`}
                                                </span>
                                            )}
                                            {status === 'completed' && openCount > 0 && (
                                                <span className="shrink-0 text-xs font-medium text-warning-600">
                                                    {plural(openCount, 'item')} not done yet
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="mt-1 text-sm sm:text-base font-semibold line-clamp-2">{module.title}</h3>
                                        {module.description && (
                                            <p className={cn('mt-0.5 text-xs sm:text-sm text-ink-600', !expanded && 'line-clamp-1')}>
                                                {module.description}
                                            </p>
                                        )}
                                        {lockedReason && (
                                            <p className="mt-1 text-sm text-ink-600">{lockedReason}</p>
                                        )}
                                    </div>

                                    {!isLocked && reviewItem && (
                                        <Link to={itemLinkFor(reviewItem, courseId)} className="shrink-0">
                                            <Button variant="secondary" size="sm">
                                                Review
                                            </Button>
                                        </Link>
                                    )}
                                </div>

                                {/* Expand/collapse toggle — resources only */}
                                {!isLocked && hasResources && (
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
                                                {expanded ? 'Hide resources' : `Show ${resources.length} resource${resources.length !== 1 ? 's' : ''}`}
                                            </span>
                                            <span className="text-ink-600">
                                                {resources.filter((i) => i.is_complete).length}/{resources.length} completed
                                            </span>
                                        </button>

                                        {expanded && (
                                            <div className="mt-2 flex flex-col gap-2">
                                                <ItemGroup
                                                    label="Resources"
                                                    icon={BookOpen}
                                                    items={resources}
                                                    courseId={courseId}
                                                    defaultOpen={true}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Hint to visit Assessments tab if this module has assessments but no resources */}
                                {!isLocked && !hasResources && assessments.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('assessments')}
                                        className="mt-2 flex w-full items-center gap-1.5 border-t border-surface-100 pt-2 text-xs text-blue-600 hover:underline"
                                    >
                                        <ClipboardList className="size-3.5" aria-hidden="true" />
                                        {plural(assessments.length, 'assessment')} — see Assessments tab
                                    </button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Assessments tab — all assignments + evaluations across all modules */}
            {activeTab === 'assessments' && (
                <div className="flex flex-col gap-4">
                    {assessmentModules.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-surface-50 px-6 py-10 text-center">
                            <ClipboardList className="mx-auto size-8 text-ink-300" aria-hidden="true" />
                            <p className="mt-2 text-sm font-medium text-ink-900">No assessments in this course</p>
                            <p className="text-xs text-ink-600">Assignments and evaluations will appear here once added.</p>
                        </div>
                    ) : (
                        assessmentModules.map(({ module, assignments, evaluations }, idx) => {
                            const status = statusFor(module.id);
                            const display = statusDisplay[status];
                            const isLocked = status === 'locked';

                            return (
                                <div key={module.id} className={cn('space-y-2', isLocked && 'opacity-60')}>
                                    {/* Module heading */}
                                    <div className="flex items-center gap-2 px-1">
                                        <div
                                            className={cn(
                                                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                                status === 'completed' && 'bg-success-600 text-white',
                                                status === 'in_progress' && 'bg-blue-600 text-white',
                                                (status === 'not_started' || status === 'locked') && 'bg-surface-100 text-ink-600',
                                            )}
                                        >
                                            {status === 'completed' ? (
                                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                            ) : (
                                                idx + 1
                                            )}
                                        </div>
                                        <h3 className="text-sm font-semibold text-ink-900">{module.title}</h3>
                                        <Badge label={display.label} tone={display.tone} icon={display.icon} />
                                    </div>

                                    {assignments.length > 0 && (
                                        <ItemGroup
                                            label="Assignments"
                                            icon={FileCheck2}
                                            items={assignments}
                                            courseId={courseId}
                                            defaultOpen={!isLocked}
                                        />
                                    )}
                                    {evaluations.length > 0 && (
                                        <ItemGroup
                                            label="Evaluations"
                                            icon={ListChecks}
                                            items={evaluations}
                                            courseId={courseId}
                                            defaultOpen={!isLocked}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {isReviewModalOpen && course && (
                <ReviewFormModal course={course} existingReview={myReview} onClose={() => setIsReviewModalOpen(false)} />
            )}
        </PageFrame>
    );
}
