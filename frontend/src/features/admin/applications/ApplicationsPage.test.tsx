import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect } from 'vitest';
import { ApplicationsPage } from '@/features/admin/applications/ApplicationsPage';
import { PageHeaderProvider } from '@/lib/pageHeader/PageHeaderContext';

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

it('approves a pending application, which then loses its approve/reject buttons', async () => {
    const user = userEvent.setup();
    renderPage();

    const approveButton = await screen.findByRole('button', { name: 'Approve Amara Kintu' });
    await user.click(approveButton);

    expect(await screen.findByRole('button', { name: 'View Amara Kintu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Amara Kintu' })).not.toBeInTheDocument();
});

it('opens the edit modal and saves a change to the student name', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Amara Kintu' }));

    const nameInput = screen.getByLabelText('Student name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Amara K. Updated');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Amara K. Updated')).toBeInTheDocument();
});

it('deletes an application after a second confirming click', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Amara Kintu');
    const deleteButton = screen.getByRole('button', { name: 'Delete Amara Kintu' });
    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: 'Confirm delete Amara Kintu' }));

    expect(screen.queryByText('Amara Kintu')).not.toBeInTheDocument();
});
