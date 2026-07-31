import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { ResourceForm } from '@/features/courseStructure/ResourceForm';

/** `Select` is a Radix combobox now, not a native `<select>` — open it, then click the option. */
async function selectRadixOption(user: UserEvent, labelText: string, optionText: string) {
    await user.click(screen.getByRole('combobox', { name: labelText }));
    await user.click(await screen.findByRole('option', { name: optionText }));
}

// The real Tiptap/ProseMirror editor dispatches transactions that call DOM APIs jsdom doesn't
// implement (elementFromPoint, Range.getClientRects) — a well-known jsdom/ProseMirror gap, not
// something specific to this app. Stubbed with a plain labeled textarea so this file can verify
// ResourceForm's own responsibility (wiring the editor's value/onChange into the submitted
// payload and the required-field guard) without depending on real WYSIWYG interaction, which
// belongs in manual/browser verification instead.
vi.mock('@/components/editor/RichTextEditor', () => ({
    default: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
        <textarea aria-label="Lesson content" value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));

it('shows only the fields relevant to the selected resource type', async () => {
    const user = userEvent.setup();
    render(<ResourceForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    // Defaults to "reading" — the rich text editor is lazy-loaded, so wait for it to mount.
    expect(await screen.findByLabelText('Lesson content')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bunny Stream video ID')).not.toBeInTheDocument();

    await selectRadixOption(user, 'Type', 'Video');

    expect(screen.getByLabelText('Bunny Stream video ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Lesson content')).not.toBeInTheDocument();

    await selectRadixOption(user, 'Type', 'Live session');

    expect(screen.getByLabelText('Meeting URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bunny Stream video ID')).not.toBeInTheDocument();
});

it('submits the type, title, and type-specific fields together', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Week 1 reading');
    await user.type(await screen.findByLabelText('Lesson content'), '<p>Hello</p>');
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

it('blocks submitting a reading resource with no lesson content', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await screen.findByLabelText('Lesson content');
    await user.type(screen.getByLabelText('Title'), 'Empty lesson');
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(await screen.findByText('Lesson content is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
});

it('defaults a document resource to file upload, and submits the picked file', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await selectRadixOption(user, 'Type', 'Document (PDF/PPTX/DOCX)');

    expect(screen.queryByLabelText('File URL')).not.toBeInTheDocument();

    const file = new File(['%PDF-1.4'], 'syllabus.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.type(screen.getByLabelText('Title'), 'Syllabus');
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'document', file }));
});

it('lets a document resource fall back to pasting a URL instead of uploading', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await selectRadixOption(user, 'Type', 'Document (PDF/PPTX/DOCX)');
    await user.click(screen.getByRole('button', { name: 'Paste a URL instead' }));

    await user.type(screen.getByLabelText('Title'), 'Syllabus');
    await user.type(screen.getByLabelText('File URL'), 'https://example.com/syllabus.pdf');
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'document', file_url: 'https://example.com/syllabus.pdf' }),
    );
});
