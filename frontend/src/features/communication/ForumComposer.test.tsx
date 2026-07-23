import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ForumComposer } from '@/features/communication/ForumComposer';

vi.mock('@/features/communication/api', () => ({
    fetchForumTags: vi.fn().mockResolvedValue([]),
}));

function renderComposer(onSubmit: (values: unknown) => Promise<void>) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <ForumComposer onSubmit={onSubmit} />
        </QueryClientProvider>,
    );
}

function oversizedFile(): File {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    return file;
}

it('rejects an attachment over 5MB client-side without calling onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderComposer(onSubmit);

    await user.type(screen.getByPlaceholderText('Share your thoughts'), 'Big clip incoming');
    await user.click(screen.getByRole('button', { name: 'Attach a video, up to 5MB' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, oversizedFile());

    expect(await screen.findByText(/over 5MB/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(onSubmit).not.toHaveBeenCalled();
});

it('switches to a bigger textarea in Article mode and submits with attachment_type article', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderComposer(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Write a long-form article' }));
    await user.type(screen.getByPlaceholderText('Share your thoughts'), 'A longer write-up.');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).toHaveBeenCalledWith({
        title: undefined,
        body: 'A longer write-up.',
        tags: undefined,
        attachmentType: 'article',
        attachment: undefined,
        removeAttachment: false,
    });
});
