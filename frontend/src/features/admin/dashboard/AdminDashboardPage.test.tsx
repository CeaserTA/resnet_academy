import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';
import type { DashboardSummary } from '@/lib/api/types';

vi.mock('@/features/catalogue/api', () => ({
    fetchCourses: vi.fn().mockResolvedValue({ data: [] }),
}));

const { summary } = vi.hoisted(() => {
    const summary: DashboardSummary = {
        students: 42,
        instructors: 5,
        courses_by_status: { published: 8, draft: 2 },
        confirmed_enrolments: 60,
        certificates_issued: 12,
        revenue_by_currency: [{ currency: 'UGX', total: 500000 }],
        open_tickets: 3,
        pending_reviews: 2,
        at_risk_students: 4,
        recent_audit_logs: [
            {
                id: 1,
                actor: {
                    id: 1,
                    role: 'admin',
                    name: 'Resnet Admin',
                    email: 'admin@resnet.test',
                    phone: null,
                    avatar_url: null,
                    first_name: null,
                    last_name: null,
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
                },
                action: 'enrolment.confirmed',
                entity_type: 'enrolment',
                entity_id: 7,
                meta: null,
                created_at: new Date().toISOString(),
            },
        ],
    };

    return { summary };
});

vi.mock('@/features/admin/dashboard/api', () => ({
    fetchDashboardSummary: vi.fn().mockResolvedValue(summary),
}));

// The Needs-action and Cohorts panels read from the same endpoints the Payments,
// Applications and Cohorts pages use.
const { page } = vi.hoisted(() => ({
    page: <T,>(data: T[], total = data.length) => ({
        data,
        meta: { current_page: 1, last_page: 1, per_page: 50, total },
        links: { first: null, last: null, prev: null, next: null },
    }),
}));

vi.mock('@/features/admin/payments/api', () => ({
    fetchOrders: vi.fn().mockResolvedValue(page([
        { id: 1, pending_submission: { id: 9 } },
        { id: 2, pending_submission: { id: 10 } },
        { id: 3, pending_submission: null },
    ])),
    fetchPaymentSummary: vi.fn().mockResolvedValue({
        by_currency: [{ currency: 'UGX', orders: 5, expected: 2000000, received: 500000, outstanding: 1500000 }],
    }),
}));

vi.mock('@/features/courseApplications/api', () => ({
    fetchCourseApplications: vi.fn().mockResolvedValue(page([], 7)),
}));

vi.mock('@/features/cohorts/api', () => ({
    fetchCohorts: vi.fn().mockResolvedValue([
        { id: 1, name: 'november-2099', start_date: '2099-11-02', end_date: '2099-12-18', application_deadline: '2099-10-23', status: 'published', course_count: 2, courses: [{ status: 'open', is_accepting_applications: true }] },
        { id: 2, name: 'Legacy self-paced', start_date: '2026-01-01', end_date: '2036-01-01', application_deadline: null, status: 'archived', course_count: 1, courses: [] },
    ]),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <PageHeaderProvider>
                    <AdminDashboardPage />
                </PageHeaderProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('shows needs-action counts, honest volume metrics, cohorts and readable activity', async () => {
    renderPage();

    // Volume
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('UGX 500.0K')).toBeInTheDocument();
    expect(await screen.findByText('UGX 1.5M still outstanding')).toBeInTheDocument();
    expect(screen.getByText('Certificate rate')).toBeInTheDocument();
    expect(screen.getByText('12 of 60 enrolments')).toBeInTheDocument();

    // Needs action — including the counts that come from other endpoints
    expect(await screen.findByRole('link', { name: /Payments\s*2\s*Receipts to confirm/ })).toHaveAttribute('href', '/admin/payments');
    expect(await screen.findByRole('link', { name: /Applications\s*7\s*Waiting for a decision/ })).toHaveAttribute('href', '/admin/applications');
    expect(screen.getByRole('link', { name: /At-risk students\s*4/ })).toBeInTheDocument();

    // Cohorts: open cohorts shown with a humanised name; archived ones hidden
    expect(await screen.findByText('November 2099')).toBeInTheDocument();
    expect(screen.queryByText('Legacy self-paced')).not.toBeInTheDocument();
    expect(screen.getByText(/8 published courses/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /New course/ })).toHaveAttribute('href', '/admin/courses/new');
    expect(screen.getByRole('link', { name: /Provision user/ })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByText('Resnet Admin confirmed an enrolment.')).toBeInTheDocument();
});

it('opens Bulk import as a modal instead of navigating to a page', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('42');

    const bulkImportButton = screen.getByRole('button', { name: /Bulk import/ });
    expect(bulkImportButton).not.toHaveAttribute('href');

    await user.click(bulkImportButton);

    expect(await screen.findByText('Bulk enrolment import')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Queue import/ })).toBeInTheDocument();
});
