import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LessonRenderer } from '@/features/learning/LessonRenderer';
import type { ResourceItem } from '@/lib/api/types';

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

interface ReadingLessonViewProps {
    resource: ResourceItem;
    isComplete: boolean;
    onMarkRead: () => void;
    isMarkingRead: boolean;
}

/**
 * Reading-resource-specific content (reading time estimate, then the lesson body, then
 * mark-as-read) — deliberately not applied to any other resource type. Previous/next navigation
 * lives one level up in `ResourceViewerPage`, shared across every resource type rather than
 * duplicated here.
 */
export function ReadingLessonView({ resource, isComplete, onMarkRead, isMarkingRead }: ReadingLessonViewProps) {
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
        </div>
    );
}
