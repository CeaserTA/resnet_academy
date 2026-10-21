import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import type { CourseReview } from '@/lib/api/types';

/**
 * A finished course's review, shown by its status — one rule wherever it appears:
 *   none      → "Rate this course"
 *   pending   → their stars + "Awaiting approval" (no action)
 *   approved  → their stars + "Thanks for your review" (no action)
 *   rejected  → "Your review wasn't published" + "Edit your review"
 * Renders nothing until the student's reviews have loaded, so no button flashes and disappears.
 */
export function ReviewStatus({
    review,
    isLoaded,
    onReview,
    size = 'sm',
}: {
    review: CourseReview | undefined;
    isLoaded: boolean;
    onReview: () => void;
    size?: 'sm' | 'md';
}) {
    if (!isLoaded) return null;

    const buttonSize = size === 'sm' ? 'sm' : undefined;

    if (!review) {
        return (
            <Button variant="secondary" size={buttonSize} onClick={onReview} className="shrink-0">
                <Star className="size-4" aria-hidden="true" />
                Rate this course
            </Button>
        );
    }

    if (review.status === 'rejected') {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-600">Your review wasn&apos;t published.</span>
                <Button variant="secondary" size={buttonSize} onClick={onReview} className="shrink-0">
                    <Star className="size-4" aria-hidden="true" />
                    Edit your review
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <StarRating value={review.rating} readOnly size="sm" />
            <span className="text-xs text-ink-600">
                {review.status === 'pending' ? 'Awaiting approval' : 'Thanks for your review'}
            </span>
        </div>
    );
}
