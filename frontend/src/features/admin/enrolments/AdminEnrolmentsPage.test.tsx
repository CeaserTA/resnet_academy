import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AdminEnrolmentsPage } from '@/features/admin/enrolments/AdminEnrolmentsPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { fetchAdminEnrolments, updateEnrolmentStatus } from '@/features/admin/enrolments/api';
import type { AdminEnrolment, PaginatedResponse, User } from '@/lib/api/types';

function makeAdmin(): User {
    return {
        id: 1,
        role: 'admin',
        name: 'Resnet Admin',
        first_name: null,
        last_name: null,
        email: 'admin@example.com',
        phone: null,
        avatar_url: null,
        bio: null,
        country: null,
        city: null,
        highest_qualification: null,
        occupation: null,
        linkedin_profile: null,
        portfolio_website: null,
        postal_code: null,
        tax_id: null,
        status: 'active',
        email_verified_at: '2026-01-01T00:00:00Z',
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
    };
}

function makeEnrolment(overrides: Partial<AdminEnrolment> & Pick<AdminEnrolment, 'id'>): AdminEnrolment {
    return {
        student: { id: 10, name: 'Amara Kintu', email: 'amara@example.com' },
        course: { id: 1, title: 'Advanced Laravel', enrolment_policy: 'application' },
        section: { id: 5, name: 'Cohort 3' },
        status: 'confirmed',
        source: 'self',
        progress_percent: 40,
        applied_at: '2026-07-18T09:12:00Z',
        created_at: '2026-07-18T09:12:00Z',
        ...overrides,
    };
}

const { MOCK_ENROLMENTS } = vi.hoisted(() => {
    const MOCK_ENROLMENTS: AdminEnrolment[] = [
        {
            id: 1,
            student: { id: 10, name: 'Amara Kintu', email: 'amara@example.com' },
            course: { id: 1, title: 'Advanced Laravel', enrolment_policy: 'application' },
            section: { id: 5, name: 'Cohort 3' },
            status: 'confirmed',
            source: 'self',
            progress_percent: 40,
            applied_at: '2026-07-18T09:12:00Z',
            created_at: '2026-07-18T09:12:00Z',
        },
        {
            id: 2,
            student: { id: 11, name: 'Priya Shah', email: 'priya@example.com' },
            course: { id: 2, title: 'UX Design Fundamentals', enrolment_policy: 'open' },
            section: null,
            status: 'waitlisted',
            source: 'admin_bulk',
            progress_percent: 0,
            applied_at: '2026-07-17T11:05:00Z',
            created_at: '2026-07-17T11:05:00Z',
        },
        {
            id: 3,
            student: { id: 12, name: 'Kevin Ssemwogerere', email: 'kevin@example.com' },
            course: { id: 2, title: 'UX Design Fundamentals', enrolment_policy: 'open' },
            section: null,
            status: 'withdrawn',
            source: 'self',
            progress_percent: 10,
            applied_at: '2026-07-16T10:20:00Z',
            created_at: '2026-07-16T10:20:00Z',
        },
    ];

    return { MOCK_ENROLMENTS };
});

function paginated(rows: AdminEnrolment[]): PaginatedResponse<AdminEnrolment> {
    return {
        data: rows,
        meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length },
        links: { first: null, last: null, prev: null, next: null },
    };
}

vi.mock('@/features/admin/enrolments/api', () => ({
    fetchAdminEnrolments: vi.fn().mockResolvedValue(paginated(MOCK_ENROLMENTS)),
    updateEnrolmentStatus: vi.fn().mockImplementation((id: number, status: string) =>
        Promise.resolve(makeEnrolment({ id, status: status as AdminEnrolment['status'] })),
    ),
}));

vi.mock('@/features/catalogue/api', () => ({
    fetchCourses: vi.fn().mockResolvedValue({
        data: [
            { id: 1, title: 'Advanced Laravel' },
            { id: 2, title: 'UX Design Fundamentals' },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
        links: { first: null, last: null, prev: null, next: null },
    }),
}));

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(makeAdmin()),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <PageHeaderProvider>
                    <AdminEnrolmentsPage />
                </PageHeaderProvider>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

it('renders the roster with student, course, derived source labels and status badges', async () => {
    renderPage();

    expect(await screen.findByText('Amara Kintu')).toBeInTheDocument();
    expect(screen.getByText('amara@example.com')).toBeInTheDocument();
    // Course title appears both in the filter select and in the row.
    expect(screen.getAllByText('Advanced Laravel')).toHaveLength(2);
    expect(screen.getByText('Cohort 3')).toBeInTheDocument();
    // Two rows have no section.
    expect(screen.getAllByText('Self-paced')).toHaveLength(2);

    // Source labels: approved-application enrolments keep source "self" server-side.
    expect(screen.getByText('Approved Application')).toBeInTheDocument();
    expect(screen.getByText('Admin Import')).toBeInTheDocument();
    expect(screen.getAllByText('Self Enrolled')).toHaveLength(1);

    // Each status appears once as a tab pill and once as a row badge.
    expect(screen.getAllByText('Confirmed')).toHaveLength(2);
    expect(screen.getAllByText('Waitlisted')).toHaveLength(2);
    expect(screen.getAllByText('Withdrawn')).toHaveLength(2);
    expect(screen.getByText('40%')).toBeInTheDocument();
});

it('passes the active status tab through to the API as a filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Amara Kintu');

    await user.click(screen.getByRole('button', { name: 'Waitlisted' }));

    await waitFor(() => {
        expect(fetchAdminEnrolments).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'waitlisted' }),
        );
    });
});

it('revokes a confirmed enrolment and confirms a waitlisted one', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Amara Kintu');

    await user.click(screen.getByRole('button', { name: 'Revoke enrolment for Amara Kintu' }));
    expect(updateEnrolmentStatus).toHaveBeenCalledWith(1, 'withdrawn');

    await user.click(screen.getByRole('button', { name: 'Confirm enrolment for Priya Shah' }));
    expect(updateEnrolmentStatus).toHaveBeenCalledWith(2, 'confirmed');
});

it('debounces the search box and sends it as the search filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Amara Kintu');

    await user.type(screen.getByLabelText('Search students by name or email'), 'priya');

    await waitFor(
        () => {
            expect(fetchAdminEnrolments).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'priya' }),
            );
        },
        { timeout: 2000 },
    );
});
