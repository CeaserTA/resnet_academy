import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';
import type { DashboardSummary } from '@/lib/api/types';

const { summary } = vi.hoisted(() => {
    const summary: DashboardSummary = {
        students: 42,
        instructors: 5,
        courses_by_status: { published: 8, draft: 2 },
        confirmed_enrolments: 60,
        certificates_issued: 12,
        revenue_by_currency: [{ currency: 'UGX', total: 500000 }],
        open_tickets: 3,
        at_risk_students: 4,
        recent_audit_logs: [
            {
                id: 1,
                actor: { id: 1, role: 'admin', name: 'Resnet Admin', email: 'admin@resnet.test', phone: null, avatar_url: null, status: 'active', email_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
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

it('shows stat cards from the fetched summary and quick action links to the right routes', async () => {
    renderPage();

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8 published · 2 draft')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /New course/ })).toHaveAttribute('href', '/admin/courses/new');
    expect(screen.getByRole('link', { name: /Provision user/ })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /Bulk import/ })).toHaveAttribute('href', '/admin/enrolments/import');

    expect(screen.getByText(/enrolment.confirmed/)).toBeInTheDocument();
});
