import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ForumPage } from '@/features/communication/ForumPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { ForumThread, User } from '@/lib/api/types';

const { student, feedThread, myThread } = vi.hoisted(() => {
    const student: User = {
        id: 1,
        role: 'student',
        name: 'Ceaser Adra',
        email: 'ceaser@example.com',
        phone: null,
        avatar_url: null,
        status: 'active',
        email_verified_at: '2026-01-01T00:00:00Z',
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
    };

    const feedThread: ForumThread = {
        id: 1,
        forum_id: 1,
        creator: { ...student, id: 2, name: 'Another Student' },
        is_pinned: false,
        is_locked: false,
        created_at: new Date().toISOString(),
        reply_count: 0,
        post: {
            id: 10,
            thread_id: 1,
            user: { ...student, id: 2, name: 'Another Student' },
            body: 'when is the next cohort',
            attachment_type: null,
            attachment_url: null,
            attachment_original_name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    };

    const myThread: ForumThread = {
        ...feedThread,
        id: 2,
        creator: student,
        post: { ...feedThread.post, id: 11, thread_id: 2, user: student, body: 'My own post' },
    };

    return { student, feedThread, myThread };
});

const fetchForumThreads = vi.fn(async (_courseId: number, params: { mine?: boolean } = {}) =>
    params.mine ? [myThread] : [feedThread, myThread],
);
const createForumThread = vi.fn().mockResolvedValue(feedThread);

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

vi.mock('@/features/communication/api', () => ({
    fetchForumThreads: (...args: [number, { mine?: boolean }?]) => fetchForumThreads(...args),
    createForumThread: (...args: unknown[]) => createForumThread(...args),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/courses/1/forum']}>
                <AuthProvider>
                    <Routes>
                        <Route path="/courses/:id/forum" element={<ForumPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('shows the feed by default, switches to My Posts, and posts via the composer', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('when is the next cohort')).toBeInTheDocument();
    expect(screen.getByText('My own post')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'My Posts' }));

    await waitFor(() => expect(fetchForumThreads).toHaveBeenLastCalledWith(1, { search: undefined, mine: true }));
    expect(await screen.findByText('My own post')).toBeInTheDocument();
    expect(screen.queryByText('when is the next cohort')).not.toBeInTheDocument();

    const composerTextarea = screen.getAllByPlaceholderText('Share your thoughts')[0];
    await user.type(composerTextarea, 'Anyone free to study tonight?');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
        expect(createForumThread).toHaveBeenCalledWith(1, 'Anyone free to study tonight?', {
            attachmentType: undefined,
            attachment: undefined,
            removeAttachment: false,
        }),
    );
});
