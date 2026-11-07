import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue({ id: 1, name: 'Amina Kirabo', role: 'student' }),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn(),
}));

function Probe() {
    const { user, logout } = useAuth();
    return (
        <div>
            <p>{user ? `Signed in as ${user.name}` : 'Signed out'}</p>
            <button type="button" onClick={() => void logout()}>Sign out</button>
        </div>
    );
}

it('shows the user as signed out straight after logout, without a refresh', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Something cached for this user that must not survive the logout.
    queryClient.setQueryData(['courses', 6, 'modules'], [{ id: 1 }]);

    render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Probe />
            </AuthProvider>
        </QueryClientProvider>,
    );

    expect(await screen.findByText('Signed in as Amina Kirabo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(queryClient.getQueryData(['courses', 6, 'modules'])).toBeUndefined();
});
