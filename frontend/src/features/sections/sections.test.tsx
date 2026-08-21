import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, describe, beforeEach } from 'vitest';
import { CreateSectionModal } from './CreateSectionModal';
import { EditSectionModal } from './EditSectionModal';
import { SectionRow } from './SectionRow';
import { useCreateSection, useUpdateSection } from './useSections';
import type { CourseSection } from './types';

// ─── Module mocks ─────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the compiled output by Vitest, so the mock
// is in place before any import resolution happens.

vi.mock('./useSections', () => ({
    useCreateSection: vi.fn(),
    useUpdateSection: vi.fn(),
    useDeleteSection: vi.fn(),
    useSections: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeSection(overrides: Partial<CourseSection> = {}): CourseSection {
    return {
        id: 1,
        course_id: 10,
        name: 'Spring 2026 Cohort',
        start_date: '2026-03-01',
        end_date: '2026-06-30',
        capacity: 30,
        seats_taken: 25,
        status: 'open',
        enrolled_count: 25,
        waitlisted_count: 0,
        applications_pending_count: 0,
        is_full: false,
        is_accepting_applications: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeMutation(overrides: any = {}) {
    return {
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
        isSuccess: false,
        isError: false,
        isIdle: true,
        data: undefined,
        error: null,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        paused: false,
        reset: vi.fn(),
        ...overrides,
    };
}

// ─── CreateSectionModal ───────────────────────────────────────────────────────

describe('CreateSectionModal', () => {
    beforeEach(() => {
        vi.mocked(useCreateSection).mockReturnValue(
            makeMutation() as any,
        );
    });

    it('shows a field error for end_date when the API returns a validation failure', async () => {
        const user = userEvent.setup();

        const apiError = Object.assign(new Error('Validation failed'), {
            status: 422,
            code: 'validation_error',
            fields: { end_date: ['The end date must be a date after start date.'] },
            missing_fields: undefined,
            fieldError: (f: string) =>
                ({ end_date: 'The end date must be a date after start date.' } as Record<string, string>)[f],
        });

        vi.mocked(useCreateSection).mockReturnValue(
            makeMutation({ mutateAsync: vi.fn().mockRejectedValue(apiError) }) as any,
        );

        render(<CreateSectionModal isOpen courseId={10} onClose={vi.fn()} />, { wrapper });

        await user.type(screen.getByLabelText('Section Name'), 'Test Cohort');
        await user.type(screen.getByLabelText('Start Date'), '2026-06-01');
        await user.type(screen.getByLabelText('End Date'), '2026-03-01');

        await user.click(screen.getByRole('button', { name: 'Create Section' }));

        expect(
            await screen.findByText('The end date must be a date after start date.'),
        ).toBeInTheDocument();
    });

    it('does not call the API when required fields are missing (HTML5 constraint)', async () => {
        const user = userEvent.setup();
        const mutateAsync = vi.fn().mockResolvedValue({});
        vi.mocked(useCreateSection).mockReturnValue(
            makeMutation({ mutateAsync }) as any,
        );

        render(<CreateSectionModal isOpen courseId={10} onClose={vi.fn()} />, { wrapper });

        // All required fields empty — HTML5 validation should prevent submit
        await user.click(screen.getByRole('button', { name: 'Create Section' }));

        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('calls onClose after a successful create', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<CreateSectionModal isOpen courseId={10} onClose={onClose} />, { wrapper });

        await user.type(screen.getByLabelText('Section Name'), 'New Cohort');
        await user.type(screen.getByLabelText('Start Date'), '2026-03-01');
        await user.type(screen.getByLabelText('End Date'), '2026-06-30');

        await user.click(screen.getByRole('button', { name: 'Create Section' }));

        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ─── EditSectionModal — capacity blocking ─────────────────────────────────────

describe('EditSectionModal — capacity blocking', () => {
    beforeEach(() => {
        vi.mocked(useUpdateSection).mockReturnValue(
            makeMutation() as any,
        );
    });

    it('shows the red error and disables the submit button when capacity < seats_taken', async () => {
        const user = userEvent.setup();
        const section = makeSection({ seats_taken: 25, capacity: 30 });

        render(
            <EditSectionModal isOpen courseId={10} section={section} onClose={vi.fn()} />,
            { wrapper },
        );

        const capacityInput = screen.getByLabelText(/Capacity/i);
        await user.clear(capacityInput);
        await user.type(capacityInput, '20'); // 20 < 25 enrolled

        expect(
            screen.getByText(/Cannot reduce capacity below current enrollment count \(25\)/i),
        ).toBeInTheDocument();

        expect(screen.getByRole('button', { name: 'Update Section' })).toBeDisabled();
    });

    it('shows the yellow warning but keeps submit enabled when capacity === seats_taken', async () => {
        const user = userEvent.setup();
        const section = makeSection({ seats_taken: 25, capacity: 30 });

        render(
            <EditSectionModal isOpen courseId={10} section={section} onClose={vi.fn()} />,
            { wrapper },
        );

        const capacityInput = screen.getByLabelText(/Capacity/i);
        await user.clear(capacityInput);
        await user.type(capacityInput, '25'); // exactly seats_taken

        expect(
            screen.getByText(/No open seats available\. Withdrawals will not trigger waitlist promotion/i),
        ).toBeInTheDocument();

        expect(screen.getByRole('button', { name: 'Update Section' })).not.toBeDisabled();
    });

    it('shows no warnings when capacity is increased', async () => {
        const user = userEvent.setup();
        const section = makeSection({ seats_taken: 25, capacity: 30 });

        render(
            <EditSectionModal isOpen courseId={10} section={section} onClose={vi.fn()} />,
            { wrapper },
        );

        const capacityInput = screen.getByLabelText(/Capacity/i);
        await user.clear(capacityInput);
        await user.type(capacityInput, '40');

        expect(screen.queryByText(/Cannot reduce/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/No open seats available/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Update Section' })).not.toBeDisabled();
    });

    it('does not call mutateAsync when capacity is below seats_taken and form is submitted', async () => {
        const user = userEvent.setup();
        const mutateAsync = vi.fn().mockResolvedValue({});
        vi.mocked(useUpdateSection).mockReturnValue(
            makeMutation({ mutateAsync }) as any,
        );

        const section = makeSection({ seats_taken: 25, capacity: 30 });

        render(
            <EditSectionModal isOpen courseId={10} section={section} onClose={vi.fn()} />,
            { wrapper },
        );

        const capacityInput = screen.getByLabelText(/Capacity/i);
        await user.clear(capacityInput);
        await user.type(capacityInput, '10');

        await user.click(screen.getByRole('button', { name: 'Update Section' }));

        expect(mutateAsync).not.toHaveBeenCalled();
    });
});

// ─── EditSectionModal — status transitions ────────────────────────────────────

describe('EditSectionModal — status transitions', () => {
    beforeEach(() => {
        vi.mocked(useUpdateSection).mockReturnValue(
            makeMutation() as any,
        );
    });

    it('Draft: only Draft and Open options are enabled', () => {
        render(
            <EditSectionModal
                isOpen
                courseId={10}
                section={makeSection({ status: 'draft' })}
                onClose={vi.fn()}
            />,
            { wrapper },
        );

        const sel = screen.getByRole('combobox', { name: /Status/i });
        const opt = (v: string) => within(sel).getByRole('option', { name: new RegExp(v, 'i') });

        expect(opt('draft')).not.toBeDisabled();
        expect(opt('open')).not.toBeDisabled();
        expect(opt('in progress')).toBeDisabled();
        expect(opt('completed')).toBeDisabled();
        expect(opt('closed')).toBeDisabled();
    });

    it('Open: Open, In Progress, and Closed are enabled; Draft and Completed are disabled', () => {
        render(
            <EditSectionModal
                isOpen
                courseId={10}
                section={makeSection({ status: 'open' })}
                onClose={vi.fn()}
            />,
            { wrapper },
        );

        const sel = screen.getByRole('combobox', { name: /Status/i });
        const opt = (v: string) => within(sel).getByRole('option', { name: new RegExp(v, 'i') });

        expect(opt('open')).not.toBeDisabled();
        expect(opt('in progress')).not.toBeDisabled();
        expect(opt('closed')).not.toBeDisabled();
        expect(opt('draft')).toBeDisabled();
        expect(opt('completed')).toBeDisabled();
    });

    it('InProgress: only In Progress and Completed are enabled', () => {
        render(
            <EditSectionModal
                isOpen
                courseId={10}
                section={makeSection({ status: 'in_progress' })}
                onClose={vi.fn()}
            />,
            { wrapper },
        );

        const sel = screen.getByRole('combobox', { name: /Status/i });
        const opt = (v: string) => within(sel).getByRole('option', { name: new RegExp(v, 'i') });

        expect(opt('in progress')).not.toBeDisabled();
        expect(opt('completed')).not.toBeDisabled();
        expect(opt('draft')).toBeDisabled();
        expect(opt('open')).toBeDisabled();
        expect(opt('closed')).toBeDisabled();
    });

    it('Completed: only Completed enabled — terminal state', () => {
        render(
            <EditSectionModal
                isOpen
                courseId={10}
                section={makeSection({ status: 'completed' })}
                onClose={vi.fn()}
            />,
            { wrapper },
        );

        const sel = screen.getByRole('combobox', { name: /Status/i });
        const opt = (v: string) => within(sel).getByRole('option', { name: new RegExp(v, 'i') });

        expect(opt('completed')).not.toBeDisabled();
        expect(opt('draft')).toBeDisabled();
        expect(opt('open')).toBeDisabled();
        expect(opt('in progress')).toBeDisabled();
        expect(opt('closed')).toBeDisabled();
    });

    it('Closed: Closed and Open enabled; Draft, InProgress, Completed disabled', () => {
        render(
            <EditSectionModal
                isOpen
                courseId={10}
                section={makeSection({ status: 'closed' })}
                onClose={vi.fn()}
            />,
            { wrapper },
        );

        const sel = screen.getByRole('combobox', { name: /Status/i });
        const opt = (v: string) => within(sel).getByRole('option', { name: new RegExp(v, 'i') });

        expect(opt('closed')).not.toBeDisabled();
        expect(opt('open')).not.toBeDisabled();
        expect(opt('draft')).toBeDisabled();
        expect(opt('in progress')).toBeDisabled();
        expect(opt('completed')).toBeDisabled();
    });
});

// ─── SectionRow — delete button ───────────────────────────────────────────────

describe('SectionRow — delete button', () => {
    it('is enabled when section has zero history', () => {
        const section = makeSection({
            enrolled_count: 0,
            waitlisted_count: 0,
            applications_pending_count: 0,
        });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={vi.fn()} />
            </tbody></table>,
        );

        expect(
            screen.getByRole('button', { name: `Delete ${section.name}` }),
        ).not.toBeDisabled();
    });

    it('is disabled — via HTML disabled attribute — when section has confirmed enrolments', () => {
        const section = makeSection({ enrolled_count: 5 });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={vi.fn()} />
            </tbody></table>,
        );

        expect(
            screen.getByRole('button', {
                name: `Cannot delete ${section.name} - section has history`,
            }),
        ).toBeDisabled();
    });

    it('is disabled when section has waitlisted students', () => {
        const section = makeSection({ enrolled_count: 0, waitlisted_count: 3 });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={vi.fn()} />
            </tbody></table>,
        );

        expect(
            screen.getByRole('button', {
                name: `Cannot delete ${section.name} - section has history`,
            }),
        ).toBeDisabled();
    });

    it('is disabled when section has pending applications', () => {
        const section = makeSection({
            enrolled_count: 0,
            waitlisted_count: 0,
            applications_pending_count: 2,
        });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={vi.fn()} />
            </tbody></table>,
        );

        expect(
            screen.getByRole('button', {
                name: `Cannot delete ${section.name} - section has history`,
            }),
        ).toBeDisabled();
    });

    it('does not fire the onDelete callback when the button is disabled', async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn();
        const section = makeSection({ enrolled_count: 10 });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={onDelete} />
            </tbody></table>,
        );

        await user.click(
            screen.getByRole('button', {
                name: `Cannot delete ${section.name} - section has history`,
            }),
        );

        expect(onDelete).not.toHaveBeenCalled();
    });

    it('carries the explanatory title tooltip on the disabled button', () => {
        const section = makeSection({ enrolled_count: 1 });

        render(
            <table><tbody>
                <SectionRow section={section} onEdit={vi.fn()} onDelete={vi.fn()} />
            </tbody></table>,
        );

        expect(
            screen.getByRole('button', {
                name: `Cannot delete ${section.name} - section has history`,
            }),
        ).toHaveAttribute(
            'title',
            "Cannot delete section with enrollment/application history. Mark as 'Closed' instead.",
        );
    });
});
