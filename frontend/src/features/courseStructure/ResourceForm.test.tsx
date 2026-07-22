import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { ResourceForm } from '@/features/courseStructure/ResourceForm';

it('shows only the fields relevant to the selected resource type', async () => {
    const user = userEvent.setup();
    render(<ResourceForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    // Defaults to "reading" — content field visible, video field not.
    expect(screen.getByLabelText('Content (HTML)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bunny Stream video ID')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'video');

    expect(screen.getByLabelText('Bunny Stream video ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Content (HTML)')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'live_session');

    expect(screen.getByLabelText('Meeting URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bunny Stream video ID')).not.toBeInTheDocument();
});

it('submits the type, title, and type-specific fields together', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Week 1 reading');
    await user.type(screen.getByLabelText('Content (HTML)'), '<p>Hello</p>');
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
            type: 'reading',
            title: 'Week 1 reading',
            content_html: '<p>Hello</p>',
            is_required: true,
        }),
    );
});
