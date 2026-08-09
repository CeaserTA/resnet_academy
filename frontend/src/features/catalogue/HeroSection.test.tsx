import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import { HeroSection } from '@/features/catalogue/HeroSection';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { User } from '@/lib/api/types';

const { student } = vi.hoisted(() => {
    const student: User = {
        id: 1,
        role: 'student',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
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

    return { student };
});

const fetchCurrentUser = vi.fn();

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: () => fetchCurrentUser(),
}));

function renderHero() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <AuthProvider>
                    <HeroSection />
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    fetchCurrentUser.mockReset();
});

it('shows a "Create free account" CTA for a logged-out visitor', async () => {
    fetchCurrentUser.mockResolvedValue(null);
    renderHero();

    expect(await screen.findByRole('link', { name: /Create free account/ })).toBeInTheDocument();
});

it('hides the "Create free account" CTA once a user is logged in', async () => {
    fetchCurrentUser.mockResolvedValue(student);
    renderHero();

    expect(await screen.findByRole('button', { name: /Browse courses/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Create free account/ })).not.toBeInTheDocument();
});

it('scrolls the course grid into view when "Browse courses" is clicked', async () => {
    fetchCurrentUser.mockResolvedValue(null);
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const target = document.createElement('div');
    target.id = 'course-grid';
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    renderHero();

    await user.click(await screen.findByRole('button', { name: /Browse courses/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.body.removeChild(target);
});
