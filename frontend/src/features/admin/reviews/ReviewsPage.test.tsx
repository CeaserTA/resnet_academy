import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ReviewsPage } from '@/features/admin/reviews/ReviewsPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';
import type { CourseReview } from '@/lib/api/types';

const { MOCK_REVIEWS } = vi.hoisted(() => {
    const MOCK_REVIEWS: CourseReview[] = [
        {
            id: 1,
            rating: 5,
            review_text: 'Loved it.',
            status: 'pending',
            admin_notes: null,
            is_featured: false,
            student: { id: 1, name: 'Amara Kintu' },
            course: { id: 1, title: 'Intro to Testing' } as CourseReview['course'],
            reviewer: null,
            created_at: '2026-07-18T09:12:00Z',
            reviewed_at: null,
        },
        {
            id: 2,
            rating: 4,
            review_text: 'Pretty good.',
            status: 'approved',
            admin_notes: null,
            is_featured: false,
            student: { id: 2, name: 'Priya Shah' },
            course: { id: 2, title: 'UX Design Fundamentals' } as CourseReview['course'],
            reviewer: { id: 9, name: 'Admin' },
            created_at: '2026-07-15T11:05:00Z',
            reviewed_at: '2026-07-16T09:00:00Z',
        },
        {
            id: 3,
            rating: 2,
            review_text: 'Not for me.',
            status: 'rejected',
            admin_notes: 'Spam',
            is_featured: false,
            student: { id: 3, name: 'Kevin Ssemwogerere' },
            course: { id: 2, title: 'UX Design Fundamentals' } as CourseReview['course'],
            reviewer: { id: 9, name: 'Admin' },
            created_at: '2026-07-16T10:20:00Z',
            reviewed_at: '2026-07-17T09:00:00Z',
        },
    ];

    return { MOCK_REVIEWS };
});

vi.mock('@/features/reviews/api', () => ({
    fetchAdminReviews: vi.fn().mockResolvedValue(MOCK_REVIEWS),
    approveCourseReview: vi.fn().mockResolvedValue({ ...MOCK_REVIEWS[0], status: 'approved' }),
    rejectCourseReview: vi.fn().mockResolvedValue({ ...MOCK_REVIEWS[0], status: 'rejected' }),
    setCourseReviewFeatured: vi.fn().mockResolvedValue({ ...MOCK_REVIEWS[1], is_featured: true }),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <PageHeaderProvider>
                <ReviewsPage />
            </PageHeaderProvider>
        </QueryClientProvider>,
    );
}

it('shows all reviews pending-first on the All tab, and filters correctly on the other tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('Pending');
    expect(screen.getByText('Kevin Ssemwogerere')).toBeInTheDocument();
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('Kevin Ssemwogerere')).toBeInTheDocument();
    expect(screen.queryByText('Amara Kintu')).not.toBeInTheDocument();
});

it('shows approve/reject actions only for the pending review, and a feature toggle only for approved ones', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: "Approve Amara Kintu's review" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Feature Priya Shah's review" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Approve Priya Shah's review" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Feature Amara Kintu's review" })).not.toBeInTheDocument();
});

it('opens the view modal with the review text', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: "View Amara Kintu's review" }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Loved it.')).toBeInTheDocument();
});

it('opens the reject modal with an internal notes field', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: "Reject Amara Kintu's review" }));

    expect(await screen.findByText("Reject Amara Kintu's review")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm reject' })).toBeInTheDocument();
});
