import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthProvider } from '@/lib/auth/AuthContext';

const mockLogin = vi.fn();
const mockFetchCurrentUser = vi.fn().mockResolvedValue(null);

vi.mock('@/features/auth/api', () => ({
    login: (...args: unknown[]) => mockLogin(...args),
    fetchCurrentUser: () => mockFetchCurrentUser(),
    googleRedirectUrl: 'http://localhost:8000/api/v1/auth/google/redirect',
}));

function renderLoginPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/login']}>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

afterEach(() => {
    mockLogin.mockReset();
});

it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
});

it('submits credentials to the login endpoint', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'student@resnet.test');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('student@resnet.test', 'password'));
});
