import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { ForumComposer } from '@/features/communication/ForumComposer';

function oversizedFile(): File {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    return file;
}

it('rejects an attachment over 5MB client-side without calling onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ForumComposer onSubmit={onSubmit} />);

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

    render(<ForumComposer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Write a long-form article' }));
    await user.type(screen.getByPlaceholderText('Share your thoughts'), 'A longer write-up.');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).toHaveBeenCalledWith('A longer write-up.', {
        attachmentType: 'article',
        attachment: undefined,
        removeAttachment: false,
    });
});
