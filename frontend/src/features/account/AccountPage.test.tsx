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

    return { student };
});

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

const requestAccountDeactivation = vi.fn().mockResolvedValue(undefined);
const uploadAvatar = vi.fn().mockResolvedValue(student);
const updateProfile = vi.fn().mockResolvedValue(student);
const changePassword = vi.fn().mockResolvedValue(undefined);
const logoutOtherSessions = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/account/api', () => ({
    requestAccountDeactivation: () => requestAccountDeactivation(),
    uploadAvatar: (file: File) => uploadAvatar(file),
    updateProfile: (payload: unknown) => updateProfile(payload),
    changePassword: (payload: unknown) => changePassword(payload),
    logoutOtherSessions: () => logoutOtherSessions(),
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

it('edits the profile via the Edit modal', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/quiet@example.com/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const firstNameInput = await screen.findByLabelText('First name');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Jane' }));
});

it('logs out other devices from the Danger Zone', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/quiet@example.com/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logout all devices' }));

    expect(logoutOtherSessions).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Every other session has been signed out.')).toBeInTheDocument();
});
