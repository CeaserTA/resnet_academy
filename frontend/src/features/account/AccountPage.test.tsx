import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AccountPage } from '@/features/account/AccountPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { User } from '@/lib/api/types';

const { student } = vi.hoisted(() => {
    const student: User = {
        id: 5,
        role: 'student',
        name: 'Quiet Student',
        email: 'quiet@example.com',
        phone: null,
        avatar_url: null,
        status: 'active',
        email_verified_at: '2026-01-01T00:00:00Z',
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
    };

    return { student };
});

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

const requestAccountDeactivation = vi.fn().mockResolvedValue(undefined);
const uploadAvatar = vi.fn().mockResolvedValue(student);

vi.mock('@/features/account/api', () => ({
    fetchAccountDataExport: vi.fn().mockResolvedValue({ profile: student }),
    requestAccountDeactivation: () => requestAccountDeactivation(),
    uploadAvatar: (file: File) => uploadAvatar(file),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/account']}>
                <AuthProvider>
                    <AccountPage />
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('requires a second click to confirm deactivation, then calls the API', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/quiet@example.com/)).toBeInTheDocument();

    const deactivateButton = screen.getByRole('button', { name: 'Deactivate my account' });
    await user.click(deactivateButton);

    expect(await screen.findByRole('button', { name: 'Confirm deactivation?' })).toBeInTheDocument();
    expect(requestAccountDeactivation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm deactivation?' }));

    expect(requestAccountDeactivation).toHaveBeenCalledTimes(1);
});

it('uploads a selected photo as the new avatar', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/quiet@example.com/)).toBeInTheDocument();

    const file = new File(['fake-image-bytes'], 'me.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(uploadAvatar).toHaveBeenCalledWith(file);
});
