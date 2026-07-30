import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ApplicationsPage } from '@/features/admin/applications/ApplicationsPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';
import type { CourseApplication } from '@/lib/api/types';

function makeStudent(id: number, name: string): CourseApplication['student'] {
    return {
        id,
        role: 'student',
        name,
        first_name: null,
        last_name: null,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: null,
        avatar_url: null,
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
}

function makeCourse(id: number, title: string): CourseApplication['course'] {
    return {
        id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        description: null,
        level: 'advanced',
        enrolment_policy: 'application',
        advisory_require_attestation: false,
        application_questions: ['Why do you want to take this course?'],
        application_allow_alternative_proof: true,
        application_require_portfolio_url: false,
        thumbnail_url: null,
        prerequisites_text: null,
        price: '0',
        currency: 'UGX',
        status: 'published',
        current_version: 1,
        confirmation_delay_hours: 24,
        schedule_start_date: null,
        category: null,
        instructors: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

const { MOCK_APPLICATIONS } = vi.hoisted(() => {
    const MOCK_APPLICATIONS: CourseApplication[] = [
        {
            id: 1,
            status: 'pending',
            student: null as unknown as CourseApplication['student'],
            course: null as unknown as CourseApplication['course'],
            answers: ['Because I want to level up.'],
            portfolio_url: null,
            alternative_proof_text: null,
            recommended_courses: [],
            applied_at: '2026-07-18T09:12:00Z',
            reviewed_at: null,
        },
        {
            id: 2,
            status: 'approved',
            student: null as unknown as CourseApplication['student'],
            course: null as unknown as CourseApplication['course'],
            answers: ['I have a portfolio.'],
            portfolio_url: null,
            alternative_proof_text: null,
            recommended_courses: [],
            applied_at: '2026-07-15T11:05:00Z',
            reviewed_at: '2026-07-16T09:00:00Z',
        },
        {
            id: 3,
            status: 'rejected',
            student: null as unknown as CourseApplication['student'],
            course: null as unknown as CourseApplication['course'],
            answers: ['Not much experience yet.'],
            portfolio_url: null,
            alternative_proof_text: null,
            recommended_courses: [],
            applied_at: '2026-07-16T10:20:00Z',
            reviewed_at: '2026-07-17T09:00:00Z',
        },
    ];

    return { MOCK_APPLICATIONS };
});

MOCK_APPLICATIONS[0].student = makeStudent(1, 'Amara Kintu');
MOCK_APPLICATIONS[0].course = makeCourse(1, 'Introduction to Web Development');
MOCK_APPLICATIONS[1].student = makeStudent(2, 'Priya Shah');
MOCK_APPLICATIONS[1].course = makeCourse(2, 'UX Design Fundamentals');
MOCK_APPLICATIONS[2].student = makeStudent(3, 'Kevin Ssemwogerere');
MOCK_APPLICATIONS[2].course = makeCourse(2, 'UX Design Fundamentals');

vi.mock('@/features/courseApplications/api', () => ({
    fetchCourseApplications: vi.fn().mockResolvedValue(MOCK_APPLICATIONS),
    approveCourseApplication: vi.fn().mockResolvedValue({ ...MOCK_APPLICATIONS[0], status: 'approved' }),
    rejectCourseApplication: vi.fn().mockResolvedValue({ ...MOCK_APPLICATIONS[0], status: 'rejected' }),
}));

vi.mock('@/features/catalogue/api', () => ({
    fetchCourses: vi.fn().mockResolvedValue({ data: [] }),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <PageHeaderProvider>
                <ApplicationsPage />
            </PageHeaderProvider>
        </QueryClientProvider>,
    );
}

it('shows all applications pending-first on the All tab, and filters correctly on the other two', async () => {
    const user = userEvent.setup();
    renderPage();

    const rows = await screen.findAllByRole('row');
    expect(rows[1]).toHaveTextContent('Pending');
    expect(screen.getByText('Kevin Ssemwogerere')).toBeInTheDocument();
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(await screen.findByText('Kevin Ssemwogerere')).toBeInTheDocument();
    expect(screen.queryByText('Amara Kintu')).not.toBeInTheDocument();
    expect(screen.queryByText('Priya Shah')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approved' }));
    expect(await screen.findByText('Priya Shah')).toBeInTheDocument();
    expect(screen.queryByText('Amara Kintu')).not.toBeInTheDocument();
    expect(screen.queryByText('Kevin Ssemwogerere')).not.toBeInTheDocument();
});

it('shows approve/reject actions only for the pending application', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Approve Amara Kintu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Priya Shah' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Kevin Ssemwogerere' })).not.toBeInTheDocument();
});

it('opens the view modal with the submitted question and answer', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'View Amara Kintu' }));

    expect(screen.getByText('Why do you want to take this course?')).toBeInTheDocument();
    expect(screen.getByText('Because I want to level up.')).toBeInTheDocument();
});

it('opens the reject modal with a beginner-course recommendation picker', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Reject Amara Kintu' }));

    expect(await screen.findByText("Reject Amara Kintu's application")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm reject' })).toBeInTheDocument();
});
