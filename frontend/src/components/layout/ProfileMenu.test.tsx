import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { User } from '@/lib/api/types';

const { admin } = vi.hoisted(() => {
    const admin: User = {
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
    };

    return { admin };
});

const logoutRequest = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(admin),
    logout: () => logoutRequest(),
}));

it('opens on click, shows the user\'s name and email, and logs out on click', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <AuthProvider>
                    <ProfileMenu />
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Account menu' }));

    // "Resnet Admin" now appears twice — once in the redesigned trigger itself, once in the
    // dropdown panel's header — so this checks at least one is present rather than a unique match.
    expect(screen.getAllByText('Resnet Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('admin@resnet.test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logoutRequest).toHaveBeenCalledTimes(1);
});
