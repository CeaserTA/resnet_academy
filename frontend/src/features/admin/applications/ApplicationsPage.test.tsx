import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect } from 'vitest';
import { ApplicationsPage } from '@/features/admin/applications/ApplicationsPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';

it('sorts pending applications before approved ones with the right status badges', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <PageHeaderProvider>
                <ApplicationsPage />
            </PageHeaderProvider>
        </QueryClientProvider>,
    );

    const rows = await screen.findAllByRole('row');
    // Row 0 is the header row.
    expect(rows[1]).toHaveTextContent('Pending');
    expect(rows[rows.length - 1]).toHaveTextContent('Approved');

    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(screen.getByText(/isn't connected to a live approval workflow/)).toBeInTheDocument();
});
