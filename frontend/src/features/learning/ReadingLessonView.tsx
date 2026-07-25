import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LessonRenderer } from '@/features/learning/LessonRenderer';
import { useModules } from '@/features/courseStructure/useCourseStructure';
import type { ModuleItem, ResourceItem } from '@/lib/api/types';

const WORDS_PER_MINUTE = 200;

function estimateReadingMinutes(html: string | null | undefined): number {
    if (!html) {
        return 1;
    }

    const words = html
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;

    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function itemLinkFor(item: ModuleItem, courseId: number): string {
    if (item.item_type === 'assignment') {
        return `/learn/assignments/${item.id}?course=${courseId}`;
    }

    if (item.item_type === 'evaluation') {
        return `/learn/evaluations/${item.id}?course=${courseId}`;
    }

    return `/learn/resources/${item.id}?course=${courseId}`;
}

interface ReadingLessonViewProps {
    resource: ResourceItem;
    courseId: number;
    isComplete: boolean;
    onMarkRead: () => void;
    isMarkingRead: boolean;
}

/**
 * Reading-resource-specific page layout (requirement: reading time, lesson content, then
 * previous/next navigation) — deliberately not applied to any other resource type. Previous/next
 * is derived client-side from the same ordered module/item data `CoursePlayerPage.tsx` already
 * fetches via `useModules`, no new backend endpoint.
 */
export function ReadingLessonView({ resource, courseId, isComplete, onMarkRead, isMarkingRead }: ReadingLessonViewProps) {
    const { data: modules } = useModules(courseId);

    const { prevItem, nextItem } = useMemo(() => {
        const sortedModules = (modules ?? []).slice().sort((a, b) => a.order_index - b.order_index);
        const flatItems = sortedModules.flatMap((module) =>
            module.items.slice().sort((a, b) => a.order_index - b.order_index),
        );
        const currentIndex = flatItems.findIndex((item) => item.item_type === 'resource' && item.id === resource.id);

        if (currentIndex === -1) {
            return { prevItem: null, nextItem: null };
        }

        return {
            prevItem: currentIndex > 0 ? flatItems[currentIndex - 1] : null,
            nextItem: currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null,
        };
    }, [modules, resource.id]);

    const readingMinutes = estimateReadingMinutes(resource.details.content_html);

    return (
        <div className="flex flex-col gap-6">
            <Badge label={`${readingMinutes} min read`} tone="neutral" icon={Clock} className="self-start" />

            <LessonRenderer html={resource.details.content_html} />

            {!isComplete && (
                <Button onClick={onMarkRead} isLoading={isMarkingRead} className="self-start">
                    Mark as read
                </Button>
            )}

            {(prevItem || nextItem) && (
                <div className="flex items-center justify-between gap-3 border-t border-surface-100 pt-4">
                    {prevItem ? (
                        <Link
                            to={itemLinkFor(prevItem, courseId)}
                            className="flex min-w-0 items-center gap-1.5 text-sm text-ink-600 hover:text-blue-600"
                        >
                            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                            <span className="flex flex-col items-start">
                                <span className="text-xs text-ink-600">Previous</span>
                                <span className="max-w-40 truncate text-ink-900 sm:max-w-xs">{prevItem.title}</span>
                            </span>
                        </Link>
                    ) : (
                        <span />
                    )}

                    {nextItem && (
                        <Link
                            to={itemLinkFor(nextItem, courseId)}
                            className="flex min-w-0 items-center gap-1.5 text-right text-sm text-ink-600 hover:text-blue-600"
                        >
                            <span className="flex flex-col items-end">
                                <span className="text-xs text-ink-600">Next</span>
                                <span className="max-w-40 truncate text-ink-900 sm:max-w-xs">{nextItem.title}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
