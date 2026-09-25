import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { ResourceForm } from '@/features/courseStructure/ResourceForm';
import type { CohortCourse, ResourceModuleItem } from '@/lib/api/types';

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

// ── Live sessions are run for one cohort ─────────────────────────────────────────────────────

function cohortOffering(cohortId: number, name: string, start: string, end: string): CohortCourse {
    return {
        id: cohortId * 10,
        course_id: 1,
        cohort_id: cohortId,
        cohort_name: name,
        start_date: start,
        end_date: end,
        capacity: null,
        seats_taken: 0,
        status: 'open',
        price: '0',
        currency: 'UGX',
        price_override: null,
        currency_override: null,
        is_full: false,
        is_accepting_applications: true,
        created_at: '',
        updated_at: '',
    };
}

const september = cohortOffering(4, 'End of September 2026 cohort', '2026-09-21', '2026-10-27');
const january = cohortOffering(1, 'January 2027 Intake', '2027-01-04', '2027-05-04');

async function fillLiveSession(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: 'Live' }));
    await user.type(screen.getByLabelText('Title'), 'Week 1 live class');
    await user.type(screen.getByLabelText('Meeting URL'), 'https://zoom.us/j/123456789');
    await user.type(screen.getByLabelText('Scheduled at'), '2027-02-10T17:00');
    await user.type(screen.getByLabelText('Duration (minutes)'), '60');
}

it('asks which cohort a live session is for when the course runs in more than one', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} cohorts={[september, january]} />);

    await fillLiveSession(user);
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    // Nothing is preselected and there is no "everyone" option, so it has to be chosen.
    expect(await screen.findByText('Choose which cohort this live session is for.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('combobox', { name: 'Cohort' }));
    expect(screen.queryByRole('option', { name: 'Everyone taking this course' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: 'January 2027 Intake' }));
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'live_session', cohort_id: 1 }));
});

it('shows the chosen cohort\'s date range under the date field', async () => {
    const user = userEvent.setup();
    render(<ResourceForm onSubmit={vi.fn()} onCancel={vi.fn()} cohorts={[september, january]} />);

    await user.click(screen.getByRole('button', { name: 'Live' }));
    expect(screen.queryByText(/The date must fall within it/)).not.toBeInTheDocument();

    await selectRadixOption(user, 'Cohort', 'End of September 2026 cohort');

    expect(screen.getByText(/End of September 2026 cohort runs/)).toBeInTheDocument();
    expect(screen.getByText(/The date must fall within it/)).toBeInTheDocument();
});

it('defaults to everyone on a single-cohort course and sends no cohort', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResourceForm onSubmit={onSubmit} onCancel={vi.fn()} cohorts={[january]} />);

    await fillLiveSession(user);
    await user.click(screen.getByRole('button', { name: 'Add resource' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'live_session', cohort_id: null }));
});

it('does not add a cohort field to a course that runs in no cohort', async () => {
    const user = userEvent.setup();
    render(<ResourceForm onSubmit={vi.fn()} onCancel={vi.fn()} cohorts={[]} />);

    await user.click(screen.getByRole('button', { name: 'Live' }));

    expect(screen.queryByRole('combobox', { name: 'Cohort' })).not.toBeInTheDocument();
});

it('keeps an existing all-cohorts session editable on a multi-cohort course without forcing a choice', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const existing = {
        item_type: 'resource',
        id: 5,
        module_id: 1,
        type: 'live_session',
        title: 'Legacy class',
        description: null,
        is_required: true,
        order_index: 1,
        is_complete: null,
        details: {
            cohort_id: null,
            cohort_name: null,
            provider: 'zoom',
            meeting_url: 'https://zoom.us/j/1',
            scheduled_at: '2027-02-10T14:00:00.000Z',
            duration_minutes: 60,
        },
    } as unknown as ResourceModuleItem;

    render(<ResourceForm resource={existing} onSubmit={onSubmit} onCancel={vi.fn()} cohorts={[september, january]} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'live_session', cohort_id: null }));
});
