import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { MyCoursesPage } from '@/features/enrolment/MyCoursesPage';
import { fetchProgressDashboard } from '@/features/progress/api';
import { fetchMyReviews } from '@/features/reviews/api';
import type { Course, CourseReview, Enrolment, Module, PaginatedResponse, ProgressDashboardRow } from '@/lib/api/types';

const { enrolment, modules, progressRows } = vi.hoisted(() => {
    const course: Course = {
        id: 1,
        title: 'Intro to Testing',
        slug: 'intro-to-testing',
        description: null,
        level: 'beginner',
        enrolment_policy: 'open',
        advisory_require_attestation: false,
        application_questions: null,
        application_allow_alternative_proof: true,
        application_require_portfolio_url: false,
        thumbnail_url: null,
        prerequisites_text: null,
        price: '0.00',
        currency: 'UGX',
        status: 'published',
        current_version: 1,
        confirmation_delay_hours: 24,
        schedule_start_date: null,
        category: null,
        instructors: [],
        created_at: '',
        updated_at: '',
    };

    const enrolment: Enrolment = {
        id: 1,
        status: 'confirmed',
        source: 'self',
        course,
        applied_at: '2026-01-01T00:00:00Z',
        confirmation_email_due_at: '2026-01-01T00:00:00Z',
        confirmation_email_sent_at: null,
        order: null,
    };

    const modules: Module[] = [
        {
            id: 1,
            course_id: 1,
            title: 'Module 1',
            description: null,
            order_index: 1,
            scheduled_start_at: null,
            group_ids: [],
            status: 'not_started',
            deleted_at: null,
            items: [
                {
                    item_type: 'resource',
                    id: 10,
                    module_id: 1,
                    type: 'reading',
                    title: 'Welcome',
                    description: null,
                    is_required: true,
                    order_index: 1,
                    is_complete: false,
                    details: {},
                },
            ],
        },
    ];

    const progressRows: ProgressDashboardRow[] = [
        { course: { id: 1, title: course.title }, status: 'in_progress', percent_complete: 25, modules: [], certificate: null },
    ];

    return { course, enrolment, modules, progressRows };
});

vi.mock('@/features/enrolment/api', () => ({
    fetchMyEnrolments: vi.fn(
        (): Promise<PaginatedResponse<Enrolment>> =>
            Promise.resolve({
                data: [enrolment],
                meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
                links: { first: null, last: null, prev: null, next: null },
            }),
    ),
    withdrawEnrolment: vi.fn(),
    submitPayment: vi.fn(),
}));

vi.mock('@/features/courseApplications/api', () => ({
    fetchMyCourseApplications: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/progress/api', () => ({
    fetchProgressDashboard: vi.fn().mockResolvedValue(progressRows),
}));

vi.mock('@/features/courseStructure/api', () => ({
    fetchModules: vi.fn().mockResolvedValue(modules),
}));

vi.mock('@/features/reviews/api', () => ({
    fetchMyReviews: vi.fn().mockResolvedValue([]),
    submitCourseReview: vi.fn(),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <MyCoursesPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('links the Continue button to the next incomplete item, not the module list', async () => {
    renderPage();

    expect(await screen.findByText('Intro to Testing')).toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', '/learn/resources/10?course=1');
    });
});

it('shows a fallback icon when the course has no thumbnail', async () => {
    renderPage();

    expect(await screen.findByText('Intro to Testing')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
});

it('shows the course thumbnail image when one is set', async () => {
    enrolment.course.thumbnail_url = 'https://example.com/thumb.jpg';

    renderPage();

    await screen.findByText('Intro to Testing');
    await waitFor(() => {
        expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    enrolment.course.thumbnail_url = null;
});

const completedProgressRows: ProgressDashboardRow[] = [
    {
        course: { id: 1, title: 'Intro to Testing' },
        status: 'completed',
        percent_complete: 100,
        modules: [],
        certificate: { certificate_number: 'CERT-1', certificate_url: null },
    },
];

it('shows a "Rate this course" link once a course is completed and not yet reviewed', async () => {
    vi.mocked(fetchProgressDashboard).mockResolvedValueOnce(completedProgressRows);
    vi.mocked(fetchMyReviews).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Rate this course' })).toBeInTheDocument();
});

it('hides the review link once a pending review already exists, but offers to edit a rejected one', async () => {
    vi.mocked(fetchProgressDashboard).mockResolvedValueOnce(completedProgressRows);
    vi.mocked(fetchMyReviews).mockResolvedValueOnce([
        {
            id: 1,
            rating: 5,
            review_text: null,
            status: 'pending',
            admin_notes: null,
            is_featured: false,
            student: null,
            course: { id: 1, title: 'Intro to Testing' } as CourseReview['course'],
            reviewer: null,
            created_at: '2026-01-01T00:00:00Z',
            reviewed_at: null,
        },
    ]);

    renderPage();
    await screen.findByText('Intro to Testing');

    expect(screen.queryByRole('button', { name: 'Rate this course' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit your review' })).not.toBeInTheDocument();

    vi.mocked(fetchProgressDashboard).mockResolvedValueOnce(completedProgressRows);
    vi.mocked(fetchMyReviews).mockResolvedValueOnce([
        {
            id: 1,
            rating: 2,
            review_text: null,
            status: 'rejected',
            admin_notes: null,
            is_featured: false,
            student: null,
            course: { id: 1, title: 'Intro to Testing' } as CourseReview['course'],
            reviewer: null,
            created_at: '2026-01-01T00:00:00Z',
            reviewed_at: '2026-01-02T00:00:00Z',
        },
    ]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Edit your review' })).toBeInTheDocument();
});
