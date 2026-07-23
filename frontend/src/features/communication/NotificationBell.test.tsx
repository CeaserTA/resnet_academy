import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { NotificationBell } from '@/features/communication/NotificationBell';
import type { NotificationListResponse, User } from '@/lib/api/types';

const { response, mockUseAuth } = vi.hoisted(() => {
    const response: NotificationListResponse = {
        data: [
            { id: 1, type: 'grade_posted', title: 'Your grade is ready', body: null, related_entity_type: null, related_entity_id: null, is_read: false, sent_at: '2026-01-01T00:00:00Z' },
            { id: 2, type: 'module_unlocked', title: 'Module 2 unlocked', body: null, related_entity_type: null, related_entity_id: null, is_read: true, sent_at: '2026-01-01T00:00:00Z' },
        ],
        meta: { current_page: 1, last_page: 1, unread_count: 1 },
    };

    return { response, mockUseAuth: vi.fn() };
});

vi.mock('@/features/communication/api', () => ({
    fetchNotifications: vi.fn().mockResolvedValue(response),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
    fetchAnnouncements: vi.fn().mockResolvedValue([]),
    createAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
}));

vi.mock('@/features/catalogue/api', () => ({
    fetchCourses: vi.fn().mockResolvedValue({ data: [], links: {}, meta: { current_page: 1, last_page: 1 } }),
}));

vi.mock('@/lib/auth/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

function renderBell() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <NotificationBell />
        </QueryClientProvider>,
    );
}

it('shows the unread count and lists notifications when opened', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();

    renderBell();

    expect(await screen.findByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText('Your grade is ready')).toBeInTheDocument();
    expect(screen.getByText('Module 2 unlocked')).toBeInTheDocument();
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post an announcement' })).not.toBeInTheDocument();
});

it('lets an admin toggle to the announcement composer and back', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'admin' } as User });
    const user = userEvent.setup();

    renderBell();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    await user.click(screen.getByRole('button', { name: 'Post an announcement' }));

    expect(screen.getByText('New announcement')).toBeInTheDocument();
    expect(screen.getByLabelText('Course')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to notifications' }));

    expect(await screen.findByText('Your grade is ready')).toBeInTheDocument();
});
