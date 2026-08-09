import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ForumPage } from '@/features/communication/ForumPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { ForumThread, PaginatedResponse, User } from '@/lib/api/types';

const { student, feedThread, myThread } = vi.hoisted(() => {
    const student: User = {
        id: 1,
        role: 'student',
        name: 'Ceaser Adra',
        email: 'ceaser@example.com',
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

    const feedThread: ForumThread = {
        id: 1,
        forum_id: 1,
        title: 'When is the next cohort',
        creator: { ...student, id: 2, name: 'Another Student' },
        is_pinned: false,
        is_locked: false,
        solved: false,
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        reply_count: 0,
        tags: [],
        post: {
            id: 10,
            thread_id: 1,
            user: { ...student, id: 2, name: 'Another Student' },
            body: 'when is the next cohort',
            attachment_type: null,
            attachment_url: null,
            attachment_original_name: null,
            edited: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    };

    const myThread: ForumThread = {
        ...feedThread,
        id: 2,
        title: 'My own discussion',
        creator: student,
        post: { ...feedThread.post, id: 11, thread_id: 2, user: student, body: 'My own post' },
    };

    return { student, feedThread, myThread };
});

function paginated(data: ForumThread[]): PaginatedResponse<ForumThread> {
    return {
        data,
        meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length },
        links: { first: null, last: null, prev: null, next: null },
    };
}

const fetchForumThreads = vi.fn(async (_courseId: number, params: { mine?: boolean } = {}) =>
    paginated(params.mine ? [myThread] : [feedThread, myThread]),
);
const fetchForumTags = vi.fn().mockResolvedValue([]);
const createForumThread = vi.fn().mockResolvedValue(feedThread);

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

vi.mock('@/features/communication/api', () => ({
    fetchForumThreads: (...args: unknown[]) => fetchForumThreads(...(args as [number, { mine?: boolean }])),
    fetchForumTags: () => fetchForumTags(),
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

it('shows all discussions by default, switches to My discussions, and creates one via the composer', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('When is the next cohort')).toBeInTheDocument();
    expect(screen.getByText('My own discussion')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'My discussions' }));

    await waitFor(() =>
        expect(fetchForumThreads).toHaveBeenLastCalledWith(1, {
            search: undefined,
            mine: true,
            sort: 'latest_activity',
            tags: [],
            page: 1,
        }),
    );
    expect(await screen.findByText('My own discussion')).toBeInTheDocument();
    expect(screen.queryByText('When is the next cohort')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Discussion' }));
    await user.type(screen.getByLabelText('Title'), 'A new question');
    await user.type(screen.getByPlaceholderText('Share your thoughts'), 'Anyone free to study tonight?');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
        expect(createForumThread).toHaveBeenCalledWith(1, 'A new question', 'Anyone free to study tonight?', [], {
            attachmentType: undefined,
            attachment: undefined,
            removeAttachment: false,
        }),
    );
});
