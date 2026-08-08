import { useState } from 'react';
import { Check, Eye, Info, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
    useAdminReviews,
    useApproveCourseReview,
    useRejectCourseReview,
    useSetCourseReviewFeatured,
} from '@/features/reviews/useReviews';
import { reviewStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { CourseReview, ReviewStatus } from '@/lib/api/types';

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_ORDER: Record<ReviewStatus, number> = { pending: 0, approved: 1, rejected: 2 };

function ViewReviewModal({ review, onClose }: { review: CourseReview; onClose: () => void }) {
    const status = reviewStatusDisplay(review.status);

    return (
        <Modal isOpen onClose={onClose} title={review.student?.name ?? 'Review'}>
            <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-ink-600">Status</span>
                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Course</span>
                    <span className="text-ink-900">{review.course?.title}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Rating</span>
                    <StarRating value={review.rating} readOnly size="sm" />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Submitted</span>
                    <span className="text-ink-900">{new Date(review.created_at).toLocaleString()}</span>
                </div>

                {review.review_text && (
                    <div className="border-t border-surface-100 pt-3">
                        <p className="font-medium text-ink-900">Review</p>
                        <p className="mt-1 whitespace-pre-wrap text-ink-600">{review.review_text}</p>
                    </div>
                )}

                {review.admin_notes && (
                    <div className="border-t border-surface-100 pt-3">
                        <p className="font-medium text-ink-900">Admin notes</p>
                        <p className="mt-1 text-ink-600">{review.admin_notes}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function RejectReviewModal({ review, onClose }: { review: CourseReview; onClose: () => void }) {
    const rejectReview = useRejectCourseReview();
    const [adminNotes, setAdminNotes] = useState('');

    const handleConfirm = async () => {
        await rejectReview.mutateAsync({ id: review.id, adminNotes: adminNotes.trim() || undefined });
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Reject ${review.student?.name ?? 'this'}'s review`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} isLoading={rejectReview.isPending}>
                        Confirm reject
                    </Button>
                </>
            }
        >
            <Textarea
                label="Internal reason (optional, not shown to the student)"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
            />
        </Modal>
    );
}

export function ReviewsPage() {
    usePageHeader('Reviews', 'Course reviews, pending first.');
    const { data, isLoading } = useAdminReviews();
    const approveReview = useApproveCourseReview();
    const setFeatured = useSetCourseReviewFeatured();

    const [tab, setTab] = useState<Tab>('all');
    const [viewingReview, setViewingReview] = useState<CourseReview | null>(null);
    const [rejectingReview, setRejectingReview] = useState<CourseReview | null>(null);

    const reviews = [...(data ?? [])]
        .filter((review) => tab === 'all' || review.status === tab)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    return (
        <div>
            <div className="flex gap-1 border-b border-surface-100">
                {(
                    [
                        ['all', 'All'],
                        ['pending', 'Pending'],
                        ['approved', 'Approved'],
                        ['rejected', 'Rejected'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'border-b-2 px-3 py-2 text-sm font-medium',
                            tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-600',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && reviews.length === 0 && (
                <EmptyState icon={Info} title="No reviews" description="Nothing matches this tab." className="mt-6" />
            )}

            {!isLoading && reviews.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Course</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Rating</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Review</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">Submitted</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review, index) => {
                                const status = reviewStatusDisplay(review.status);

                                return (
                                    <tr key={review.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-ink-900">{review.student?.name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{review.course?.title}</td>
                                        <td className="px-4 py-3">
                                            <StarRating value={review.rating} readOnly size="sm" />
                                        </td>
                                        <td className="max-w-xs truncate px-4 py-3 text-ink-600">
                                            {review.review_text || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {review.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => approveReview.mutate(review.id)}
                                                            isLoading={approveReview.isPending && approveReview.variables === review.id}
                                                            aria-label={`Approve ${review.student?.name}'s review`}
                                                        >
                                                            <Check className="size-4 text-success-600" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => setRejectingReview(review)}
                                                            aria-label={`Reject ${review.student?.name}'s review`}
                                                        >
                                                            <X className="size-4 text-danger-600" aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                )}
                                                {review.status === 'approved' && (
                                                    <Button
                                                        variant="ghost"
                                                        className="px-2 py-1"
                                                        onClick={() =>
                                                            setFeatured.mutate({ id: review.id, isFeatured: !review.is_featured })
                                                        }
                                                        isLoading={setFeatured.isPending && setFeatured.variables?.id === review.id}
                                                        aria-label={
                                                            review.is_featured
                                                                ? `Unfeature ${review.student?.name}'s review`
                                                                : `Feature ${review.student?.name}'s review`
                                                        }
                                                    >
                                                        <Star
                                                            className={cn('size-4', review.is_featured ? 'fill-amber-500 text-amber-500' : 'text-ink-600')}
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setViewingReview(review)}
                                                    aria-label={`View ${review.student?.name}'s review`}
                                                >
                                                    <Eye className="size-4" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {viewingReview && <ViewReviewModal review={viewingReview} onClose={() => setViewingReview(null)} />}
            {rejectingReview && <RejectReviewModal review={rejectingReview} onClose={() => setRejectingReview(null)} />}
        </div>
    );
}
