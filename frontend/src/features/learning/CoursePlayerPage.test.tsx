import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { CoursePlayerPage } from '@/features/learning/CoursePlayerPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { fetchModules } from '@/features/courseStructure/api';
import { fetchCourseProgress } from '@/features/learning/api';
import { fetchProgressDashboard } from '@/features/progress/api';
import { fetchMyReviews } from '@/features/reviews/api';
import type { Course, CourseReview, Module, ModuleProgressEntry, ProgressDashboardRow, User } from '@/lib/api/types';

const { course, modules, progress, progressRows, student } = vi.hoisted(() => {
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

    const modules: Module[] = [
        {
            id: 1,
            course_id: 1,
            title: 'Module 1',
            description: null,
            order_index: 1,
            scheduled_start_at: null,
            deleted_at: null,
            group_ids: [],
            status: 'not_started',
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
        {
            id: 2,
            course_id: 1,
            title: 'Module 2',
            description: null,
            order_index: 2,
            scheduled_start_at: null,
            deleted_at: null,
            group_ids: [],
            status: 'locked',
            items: [
                {
                    item_type: 'resource',
                    id: 20,
                    module_id: 2,
                    type: 'reading',
                    title: 'Locked lesson',
                    description: null,
                    is_required: true,
                    order_index: 1,
                    is_complete: false,
                    details: {},
                },
            ],
        },
    ];

    const progress: ModuleProgressEntry[] = [
        {
            module_id: 1,
            module_title: 'Module 1',
            order_index: 1,
            status: 'not_started',
            unlocked_at: null,
            completed_at: null,
        },
        {
            module_id: 2,
            module_title: 'Module 2',
            order_index: 2,
            status: 'locked',
            unlocked_at: null,
            completed_at: null,
        },
    ];

    const progressRows: ProgressDashboardRow[] = [
        { course: { id: 1, title: 'Intro to Testing' }, status: 'in_progress', percent_complete: 50, modules: [], certificate: null },
    ];

    const student: User = {
        id: 1,
        role: 'student',
        name: 'Test Student',
        email: 'student@example.com',
        phone: null,
        avatar_url: null,
        first_name: null,
        last_name: null,
        bio: null,
        country: null,
        city: null,
        postal_code: null,
        tax_id: null,
        status: 'active',
        email_verified_at: '2026-01-01T00:00:00Z',
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
    };

    return { course, modules, progress, progressRows, student };
});

vi.mock('@/features/catalogue/api', () => ({
    fetchCourse: vi.fn().mockResolvedValue(course),
    fetchCourses: vi.fn(),
    fetchCategories: vi.fn(),
}));

vi.mock('@/features/courseStructure/api', () => ({
    fetchModules: vi.fn().mockResolvedValue(modules),
}));

vi.mock('@/features/learning/api', () => ({
    fetchCourseProgress: vi.fn().mockResolvedValue(progress),
}));

vi.mock('@/features/progress/api', () => ({
    fetchProgressDashboard: vi.fn().mockResolvedValue(progressRows),
}));

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

vi.mock('@/features/reviews/api', () => ({
    fetchMyReviews: vi.fn().mockResolvedValue([]),
    submitCourseReview: vi.fn(),
}));

function renderPlayer() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={['/learn/courses/1']}>
                    <Routes>
                        <Route path="/learn/courses/:id" element={<CoursePlayerPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

it('shows an unlocked module’s resources but hides a locked module’s resources', async () => {
    renderPlayer();

    expect(await screen.findAllByText('Welcome')).toHaveLength(2); // Continue banner + module list
    expect(screen.queryByText('Locked lesson')).not.toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
});

it('shows a Continue banner pointing at the next incomplete item', async () => {
    renderPlayer();

    expect(await screen.findByText('Continue where you left off')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', '/learn/resources/10?course=1');
});

it('explains why a locked module is locked', async () => {
    renderPlayer();

    expect(await screen.findByText('Complete "Module 1" first')).toBeInTheDocument();
});

it('shows the overall progress percentage from the progress dashboard', async () => {
    renderPlayer();

    expect(await screen.findByText('50%')).toBeInTheDocument();
});

it('numbers modules and offers a Start Module action linking to the next incomplete item', async () => {
    renderPlayer();

    expect(await screen.findByText('Module 01')).toBeInTheDocument();
    const startLink = screen.getByRole('link', { name: 'Start Module' });
    expect(startLink).toHaveAttribute('href', '/learn/resources/10?course=1');
});

it('collapses and re-expands a module’s resource list', async () => {
    const user = userEvent.setup();
    renderPlayer();

    expect(await screen.findAllByText('Welcome')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /View 1 Resource/ }));
    expect(screen.getAllByText('Welcome')).toHaveLength(1); // only the Continue banner now

    await user.click(screen.getByRole('button', { name: /View 1 Resource/ }));
    expect(screen.getAllByText('Welcome')).toHaveLength(2);
});

const completedModules: Module[] = [
    {
        id: 3,
        course_id: 1,
        title: 'Module 1',
        description: null,
        order_index: 1,
        scheduled_start_at: null,
        deleted_at: null,
        group_ids: [],
        status: 'completed',
        items: [
            {
                item_type: 'resource',
                id: 30,
                module_id: 3,
                type: 'reading',
                title: 'Finale',
                description: null,
                is_required: true,
                order_index: 1,
                is_complete: true,
                details: {},
            },
        ],
    },
];

const completedProgress: ModuleProgressEntry[] = [
    { module_id: 3, module_title: 'Module 1', order_index: 1, status: 'completed', unlocked_at: null, completed_at: '2026-01-01T00:00:00Z' },
];

const completedProgressRows: ProgressDashboardRow[] = [
    {
        course: { id: 1, title: 'Intro to Testing' },
        status: 'completed',
        percent_complete: 100,
        modules: [],
        certificate: { certificate_number: 'CERT-1', certificate_url: null },
    },
];

it('shows a Rate & Review prompt once the course is complete and not yet reviewed', async () => {
    vi.mocked(fetchModules).mockResolvedValueOnce(completedModules);
    vi.mocked(fetchCourseProgress).mockResolvedValueOnce(completedProgress);
    vi.mocked(fetchProgressDashboard).mockResolvedValueOnce(completedProgressRows);
    vi.mocked(fetchMyReviews).mockResolvedValueOnce([]);

    renderPlayer();

    expect(await screen.findByRole('button', { name: /Rate & Review this course/ })).toBeInTheDocument();
});

it('hides the Rate & Review prompt once a review has already been submitted', async () => {
    vi.mocked(fetchModules).mockResolvedValueOnce(completedModules);
    vi.mocked(fetchCourseProgress).mockResolvedValueOnce(completedProgress);
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

    renderPlayer();

    expect(await screen.findByText("You've completed this course!")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rate & Review this course/ })).not.toBeInTheDocument();
});
