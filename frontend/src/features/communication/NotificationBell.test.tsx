import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { NotificationBell } from '@/features/communication/NotificationBell';
import type { NotificationListResponse } from '@/lib/api/types';

const { response } = vi.hoisted(() => {
    const response: NotificationListResponse = {
        data: [
            { id: 1, type: 'grade_posted', title: 'Your grade is ready', body: null, related_entity_type: null, related_entity_id: null, is_read: false, sent_at: '2026-01-01T00:00:00Z' },
            { id: 2, type: 'module_unlocked', title: 'Module 2 unlocked', body: null, related_entity_type: null, related_entity_id: null, is_read: true, sent_at: '2026-01-01T00:00:00Z' },
        ],
        meta: { current_page: 1, last_page: 1, unread_count: 1 },
    };

    return { response };
});

vi.mock('@/features/communication/api', () => ({
    fetchNotifications: vi.fn().mockResolvedValue(response),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

it('shows the unread count and lists notifications when opened', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <NotificationBell />
        </QueryClientProvider>,
    );

    expect(await screen.findByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText('Your grade is ready')).toBeInTheDocument();
    expect(screen.getByText('Module 2 unlocked')).toBeInTheDocument();
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
});
