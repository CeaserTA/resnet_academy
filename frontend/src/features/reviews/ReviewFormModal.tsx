import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { StarRating } from '@/components/ui/StarRating';
import { useSubmitCourseReview } from '@/features/reviews/useReviews';
import { ApiError } from '@/lib/api/client';
import type { CourseReview } from '@/lib/api/types';

const REVIEW_TEXT_MAX_LENGTH = 1000;

export function ReviewFormModal({
    course,
    existingReview,
    onClose,
}: {
    course: { id: number; title: string };
    existingReview?: CourseReview | null;
    onClose: () => void;
}) {
    const submitReview = useSubmitCourseReview();
    const [rating, setRating] = useState(existingReview?.rating ?? 0);
    const [reviewText, setReviewText] = useState(existingReview?.review_text ?? '');
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        setError(null);

        if (rating < 1) {
            setError('Please select a star rating.');
            return;
        }

        try {
            await submitReview.mutateAsync({ courseId: course.id, rating, reviewText: reviewText.trim() || undefined });
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit your review. Try again.');
        }
    };

    if (submitted) {
        return (
            <Modal isOpen onClose={onClose} title="Review submitted" footer={<Button onClick={onClose}>Close</Button>}>
                <Alert variant="success" message="Thanks! Your review is being reviewed and will appear once approved." />
            </Modal>
        );
    }

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={existingReview ? `Edit your review of ${course.title}` : `Rate ${course.title}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={submitReview.isPending}>
                        Submit review
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Your rating</span>
                    <StarRating value={rating} onChange={setRating} />
                </div>

                <Textarea
                    label="Your review (optional)"
                    rows={4}
                    maxLength={REVIEW_TEXT_MAX_LENGTH}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="What did you think of this course?"
                />
                <p className="-mt-3 text-right text-xs text-ink-600">
                    {reviewText.length}/{REVIEW_TEXT_MAX_LENGTH}
                </p>
            </div>
        </Modal>
    );
}
