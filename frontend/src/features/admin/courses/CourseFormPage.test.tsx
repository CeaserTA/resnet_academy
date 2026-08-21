import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import { CourseFormPage } from '@/features/admin/courses/CourseFormPage';
import type { Course } from '@/lib/api/types';

const { baseCourse, fetchCourseMock, updateCourseMock } = vi.hoisted(() => {
    const baseCourse: Course = {
        id: 1,
        title: 'Intro to Testing',
        slug: 'intro-to-testing',
        description: null,
        level: 'beginner',
        enrolment_policy: 'open',
        advisory_require_attestation: false,
        application_questions: null,
        application_allow_alternative_proof: true,
        application_require_portfolio_url: false,
        sections_required: false,
        thumbnail_url: null,
        prerequisites_text: null,
        price: '50000.00',
        currency: 'UGX',
        status: 'published',
        current_version: 1,
        confirmation_delay_hours: 24,
        schedule_start_date: null,
        category: null,
        instructors: [],
        created_at: '',
        updated_at: '',
    };

    return { baseCourse, fetchCourseMock: vi.fn(), updateCourseMock: vi.fn().mockResolvedValue(baseCourse) };
});

vi.mock('@/features/catalogue/api', () => ({
    fetchCourse: fetchCourseMock,
    fetchCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/admin/users/api', () => ({
    fetchUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/admin/courses/api', () => ({
    updateCourse: updateCourseMock,
    createCourse: vi.fn(),
}));

function renderPage(course: Course = baseCourse) {
    fetchCourseMock.mockResolvedValue(course);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/admin/courses/1/edit']}>
                <Routes>
                    <Route path="/admin/courses/:id/edit" element={<CourseFormPage />} />
                    <Route path="/admin/courses" element={<p>Course list</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    updateCourseMock.mockClear();
});

/** `Select` is a Radix combobox now, not a native `<select>` — open it, then click the option. */
async function selectRadixOption(user: UserEvent, labelText: string, optionText: string) {
    await user.click(screen.getByRole('combobox', { name: labelText }));
    await user.click(await screen.findByRole('option', { name: optionText }));
}

it('clicking save immediately with no changes still submits', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    expect(updateCourseMock).toHaveBeenCalledTimes(1);
});

it('saves an edit without touching the enrollment policy override', async () => {
    const user = userEvent.setup();
    renderPage();

    const titleInput = await screen.findByLabelText('Title');
    expect(titleInput).toHaveValue('Intro to Testing');

    await user.clear(titleInput);
    await user.type(titleInput, 'Intro to Testing, Updated');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    expect(updateCourseMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateCourseMock.mock.calls[0];
    expect(payload.title).toBe('Intro to Testing, Updated');
    expect(payload.enrolment_policy).toBe('open');
});

it('changing the level auto-updates the default policy and still saves', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Title');
    await selectRadixOption(user, 'Level', 'Advanced');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    const [, payload] = updateCourseMock.mock.calls.at(-1)!;
    expect(payload.level).toBe('advanced');
    expect(payload.enrolment_policy).toBe('application');
});

it('loading a course that already has application_questions and saving immediately still submits', async () => {
    const user = userEvent.setup();
    const applicationCourse: Course = {
        ...baseCourse,
        level: 'advanced',
        enrolment_policy: 'application',
        application_questions: ['Why do you want to take this course?', 'What relevant experience do you have?'],
        application_require_portfolio_url: true,
    };

    renderPage(applicationCourse);

    await screen.findByLabelText('Title');
    expect(await screen.findByLabelText('Question 1')).toHaveValue('Why do you want to take this course?');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    expect(updateCourseMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateCourseMock.mock.calls[0];
    expect(payload.application_questions).toEqual([
        'Why do you want to take this course?',
        'What relevant experience do you have?',
    ]);
});

it('overriding the policy and adding application questions saves them', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Title');
    await user.click(screen.getByRole('checkbox', { name: 'Override default policy' }));
    await selectRadixOption(user, 'Enrollment policy', 'Application — admin reviews and approves');
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    await user.type(screen.getByLabelText('Question 1'), 'Why do you want to take this course?');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    const [, payload] = updateCourseMock.mock.calls.at(-1)!;
    expect(payload.enrolment_policy).toBe('application');
    expect(payload.application_questions).toEqual(['Why do you want to take this course?']);
});
