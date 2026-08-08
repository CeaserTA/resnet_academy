import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import { MyCoursesPage } from '@/features/enrolment/MyCoursesPage';
import { fetchMyEnrolments, withdrawEnrolment } from '@/features/enrolment/api';
import { dismissCourseApplication, fetchMyCourseApplications } from '@/features/courseApplications/api';
import { fetchProgressDashboard } from '@/features/progress/api';
import { fetchMyReviews } from '@/features/reviews/api';
import { profileApi } from '@/lib/api/profileApi';
import type { Course, CourseApplication, CourseReview, Enrolment, Module, PaginatedResponse, ProgressDashboardRow } from '@/lib/api/types';

const { course, enrolment, modules, progressRows } = vi.hoisted(() => {
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
    withdrawEnrolment: vi.fn().mockResolvedValue({}),
    submitPayment: vi.fn(),
}));

vi.mock('@/features/courseApplications/api', () => ({
    fetchMyCourseApplications: vi.fn().mockResolvedValue([]),
    dismissCourseApplication: vi.fn().mockResolvedValue({}),
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

vi.mock('@/lib/api/profileApi', () => ({
    profileApi: {
        getStatus: vi.fn().mockResolvedValue({
            percentage: 100,
            missing: [],
            completed: ['first_name', 'last_name', 'phone', 'country', 'city', 'highest_qualification'],
        }),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

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

function makeApplication(overrides: Partial<CourseApplication>): CourseApplication {
    return {
        id: 1,
        status: 'pending',
        student: null as unknown as CourseApplication['student'],
        course: { ...course, id: 2, title: 'Search Engine Optimisation' },
        answers: null,
        portfolio_url: null,
        alternative_proof_text: null,
        rejection_reason: null,
        dismissed_at: null,
        recommended_courses: [],
        reviewer: null,
        applied_at: '2026-08-01T00:00:00Z',
        reviewed_at: null,
        ...overrides,
    };
}

it('shows the "Applications" heading and reassurance copy while an application is pending', async () => {
    vi.mocked(fetchMyCourseApplications).mockResolvedValueOnce([makeApplication({ id: 1, status: 'pending' })]);

    renderPage();

    expect(await screen.findByText('Applications')).toBeInTheDocument();
    expect(screen.getByText(/no need to check back/)).toBeInTheDocument();
});

it('shows the "Application updates" heading once every application is resolved', async () => {
    vi.mocked(fetchMyCourseApplications).mockResolvedValueOnce([
        makeApplication({ id: 1, status: 'rejected', rejection_reason: 'Not a fit yet.' }),
    ]);

    renderPage();

    expect(await screen.findByText('Application updates')).toBeInTheDocument();
    expect(screen.getByText('Track the status of your course applications.')).toBeInTheDocument();
    expect(screen.queryByText(/no need to check back/)).not.toBeInTheDocument();
});

it('does not show the reassurance copy when applications are in mixed states', async () => {
    vi.mocked(fetchMyCourseApplications).mockResolvedValueOnce([
        makeApplication({ id: 1, status: 'pending' }),
        makeApplication({ id: 2, status: 'rejected', rejection_reason: 'Not a fit yet.', course: { ...course, id: 3, title: 'Other Course' } }),
    ]);

    renderPage();

    expect(await screen.findByText('Application updates')).toBeInTheDocument();
    expect(screen.getByText('Track the status of your course applications.')).toBeInTheDocument();
    expect(screen.queryByText(/no need to check back/)).not.toBeInTheDocument();
});

it('lists applications most-recent-first', async () => {
    vi.mocked(fetchMyCourseApplications).mockResolvedValueOnce([
        makeApplication({ id: 1, status: 'pending', applied_at: '2026-07-01T00:00:00Z', course: { ...course, id: 2, title: 'Older Application' } }),
        makeApplication({ id: 2, status: 'pending', applied_at: '2026-08-01T00:00:00Z', course: { ...course, id: 3, title: 'Newer Application' } }),
    ]);

    renderPage();

    const titles = (await screen.findAllByText(/Application$/)).map((el) => el.textContent);
    expect(titles).toEqual(['Newer Application', 'Older Application']);
});

function makeOrder(status: 'pending' | 'partial' | 'paid'): NonNullable<Enrolment['order']> {
    return {
        id: 1,
        course_id: 1,
        student: null,
        course: null,
        amount: '100000.00',
        amount_paid: '0.00',
        remaining_balance: 100000,
        currency: 'UGX',
        status,
        payment_method: null,
        provider_ref: null,
        paid_at: null,
        created_at: '2026-01-01T00:00:00Z',
        pending_submission: null,
        payment_submissions: [],
    };
}

it('shows only the enrolment-status badge, not a competing order-status badge, when confirmed', async () => {
    vi.mocked(fetchMyEnrolments).mockResolvedValueOnce({
        data: [{ ...enrolment, status: 'confirmed', order: makeOrder('pending') }],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        links: { first: null, last: null, prev: null, next: null },
    });

    renderPage();

    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
});

it('hides a withdrawn enrolment from the dashboard entirely', async () => {
    vi.mocked(fetchMyEnrolments).mockResolvedValueOnce({
        data: [{ ...enrolment, status: 'withdrawn', order: makeOrder('pending') }],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        links: { first: null, last: null, prev: null, next: null },
    });

    renderPage();

    expect(await screen.findByText(/haven.t enrolled in any courses yet/)).toBeInTheDocument();
    expect(screen.queryByText('Withdrawn')).not.toBeInTheDocument();
    expect(screen.queryByText('Intro to Testing')).not.toBeInTheDocument();
});

it('opens a confirm dialog before withdrawing, and only withdraws once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Withdraw from Intro to Testing?')).toBeInTheDocument();
    expect(withdrawEnrolment).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => {
        expect(withdrawEnrolment).toHaveBeenCalledWith(1);
    });
});

it('shows the "Make a payment" button only when a course has an outstanding balance', async () => {
    renderPage();

    await screen.findByText('Intro to Testing');
    expect(screen.queryByRole('button', { name: 'Make a payment' })).not.toBeInTheDocument();
});

it('skips the course picker and opens the payment form directly when only one course has a balance', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMyEnrolments).mockResolvedValueOnce({
        data: [{ ...enrolment, order: makeOrder('pending') }],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        links: { first: null, last: null, prev: null, next: null },
    });

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Make a payment' }));

    expect(await screen.findByLabelText(/Amount to pay/)).toBeInTheDocument();
    expect(screen.queryByText(/Choose which course/)).not.toBeInTheDocument();
});

it('opens a course picker for Make a payment when multiple courses have a balance', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMyEnrolments).mockResolvedValueOnce({
        data: [
            { ...enrolment, id: 1, order: makeOrder('pending') },
            { ...enrolment, id: 2, course: { ...course, id: 5, title: 'Second Course' }, order: makeOrder('pending') },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
        links: { first: null, last: null, prev: null, next: null },
    });

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Make a payment' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Intro to Testing')).toBeInTheDocument();
    expect(within(dialog).getByText('Second Course')).toBeInTheDocument();

    await user.click(within(dialog).getByText('Second Course'));

    expect(await screen.findByLabelText(/Amount to pay/)).toBeInTheDocument();
    expect(screen.getByText('← Choose a different course')).toBeInTheDocument();
});

it('removes a dismissed application card immediately, before the request resolves', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMyCourseApplications).mockResolvedValueOnce([
        makeApplication({ id: 1, status: 'rejected', rejection_reason: 'Not a fit yet.' }),
    ]);
    // Never resolves within the test — proves the card disappears optimistically, not after the
    // mutation settles.
    vi.mocked(dismissCourseApplication).mockReturnValueOnce(new Promise(() => {}));

    renderPage();

    expect(await screen.findByText('Search Engine Optimisation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
        expect(screen.queryByText('Search Engine Optimisation')).not.toBeInTheDocument();
    });
});

/**
 * Task 14.1: Profile Completion Card Display Tests
 * Validates Requirements: 3.1, 3.5
 */

it('renders ProfileCompletionCard when profile percentage is less than 100', async () => {
    vi.mocked(profileApi.getStatus).mockResolvedValueOnce({
        percentage: 60,
        missing: ['phone', 'country'],
        completed: ['first_name', 'last_name', 'city', 'highest_qualification'],
    });

    renderPage();

    expect(await screen.findByText('Complete your profile')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
});

it('does not render ProfileCompletionCard when profile is complete', async () => {
    vi.mocked(profileApi.getStatus).mockResolvedValueOnce({
        percentage: 100,
        missing: [],
        completed: ['first_name', 'last_name', 'phone', 'country', 'city', 'highest_qualification'],
    });

    renderPage();

    await screen.findByText('My courses');

    expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument();
});

it('hides ProfileCompletionCard on API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(profileApi.getStatus).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await screen.findByText('My courses');

    expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch profile status:', expect.any(Error));

    consoleSpy.mockRestore();
});

it('positions ProfileCompletionCard at the top before other content', async () => {
    vi.mocked(profileApi.getStatus).mockResolvedValueOnce({
        percentage: 50,
        missing: ['phone', 'country', 'city'],
        completed: ['first_name', 'last_name', 'highest_qualification'],
    });

    renderPage();

    await screen.findByText('Complete your profile');

    const container = screen.getByText('Complete your profile').closest('div');
    const myCoursesHeading = screen.getByText('My courses');

    // ProfileCompletionCard should appear before the "My courses" heading in DOM order
    expect(container?.compareDocumentPosition(myCoursesHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

it('calls profileApi.getStatus on component mount', async () => {
    renderPage();

    await screen.findByText('My courses');

    expect(profileApi.getStatus).toHaveBeenCalledTimes(1);
});

