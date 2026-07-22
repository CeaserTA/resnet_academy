import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('@/lib/auth/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

it('redirects an unauthenticated visitor to /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <p>Secret dashboard</p>
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<p>Login page</p>} />
            </Routes>
        </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
});

it('redirects a student away from an admin-only route', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'student' }, isLoading: false });

    render(
        <MemoryRouter initialEntries={['/admin/users']}>
            <Routes>
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <p>Team page</p>
                        </ProtectedRoute>
                    }
                />
                <Route path="/dashboard" element={<p>Dashboard</p>} />
            </Routes>
        </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
});

it('renders the protected content for an authorized user', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'admin' }, isLoading: false });

    render(
        <MemoryRouter initialEntries={['/admin/users']}>
            <Routes>
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <p>Team page</p>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </MemoryRouter>,
    );

    expect(screen.getByText('Team page')).toBeInTheDocument();
});
