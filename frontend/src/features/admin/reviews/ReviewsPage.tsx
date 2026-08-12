import { useState } from 'react';
import { Check, Eye, Info, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Reviews</h1>
                <p className="text-xs text-ink-400">Course reviews, pending first.</p>
            </div>

            {/* Segmented tab bar */}
            <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5 self-start">
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
                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
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
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers */}
                    <div className="grid grid-cols-[minmax(160px,1fr)_minmax(140px,1fr)_100px_minmax(120px,2fr)_110px_100px_80px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Course</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Rating</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Review</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Submitted</span>
                        <span />
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {reviews.map((review) => {
                            const status = reviewStatusDisplay(review.status);

                            return (
                                <li
                                    key={review.id}
                                    className="grid grid-cols-[minmax(160px,1fr)_minmax(140px,1fr)_100px_minmax(120px,2fr)_110px_100px_80px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                                >
                                    {/* Student */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        {review.student ? (
                                            <>
                                                <Avatar
                                                    name={review.student.name}
                                                    size="sm"
                                                    className="size-7 shrink-0 text-xs"
                                                />
                                                <p className="truncate text-sm font-medium text-ink-900">{review.student.name}</p>
                                            </>
                                        ) : (
                                            <span className="text-sm text-ink-400">—</span>
                                        )}
                                    </div>

                                    {/* Course */}
                                    <p className="truncate text-sm text-ink-600">{review.course?.title}</p>

                                    {/* Rating */}
                                    <StarRating value={review.rating} readOnly size="sm" />

                                    {/* Review text */}
                                    <p className="truncate text-sm text-ink-600">{review.review_text || '—'}</p>

                                    {/* Status */}
                                    <Badge label={status.label} tone={status.tone} icon={status.icon} />

                                    {/* Submitted */}
                                    <p className="text-right font-mono text-xs text-ink-400">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1">
                                        {review.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => approveReview.mutate(review.id)}
                                                    aria-label={`Approve ${review.student?.name}'s review`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                                >
                                                    <Check className="size-4 text-success-600" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => setRejectingReview(review)}
                                                    aria-label={`Reject ${review.student?.name}'s review`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                                                >
                                                    <X className="size-4" aria-hidden="true" />
                                                </button>
                                            </>
                                        )}
                                        {review.status === 'approved' && (
                                            <button
                                                onClick={() =>
                                                    setFeatured.mutate({ id: review.id, isFeatured: !review.is_featured })
                                                }
                                                aria-label={
                                                    review.is_featured
                                                        ? `Unfeature ${review.student?.name}'s review`
                                                        : `Feature ${review.student?.name}'s review`
                                                }
                                                className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                            >
                                                <Star
                                                    className={cn('size-4', review.is_featured ? 'fill-amber-500 text-amber-500' : '')}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setViewingReview(review)}
                                            aria-label={`View ${review.student?.name}'s review`}
                                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                        >
                                            <Eye className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {viewingReview && <ViewReviewModal review={viewingReview} onClose={() => setViewingReview(null)} />}
            {rejectingReview && <RejectReviewModal review={rejectingReview} onClose={() => setRejectingReview(null)} />}
        </div>
    );
}
