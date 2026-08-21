import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import { AssignmentSubmitPage } from '@/features/assessment/AssignmentSubmitPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { Assignment, Course, User } from '@/lib/api/types';

const { course, assignment, student, submitAssignmentMock } = vi.hoisted(() => {
    const course: Course = {
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
        price: '0.00',
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

    const assignment: Assignment = {
        id: 5,
        title: 'Project Submission',
        instructions: 'Build a small app.',
        submission_type: 'file',
        due_at: null,
        allow_late: true,
        late_penalty_policy_id: null,
        max_score: '100.00',
        plagiarism_check_enabled: false,
        rubrics: [],
    };

    const student: User = {
        id: 1,
        role: 'student',
        name: 'Test Student',
        email: 'student@example.com',
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

    return {
        course,
        assignment,
        student,
        submitAssignmentMock: vi.fn().mockResolvedValue({}),
    };
});

vi.mock('@/features/catalogue/api', () => ({
    fetchCourse: vi.fn().mockResolvedValue(course),
}));

vi.mock('@/features/assessment/api', () => ({
    fetchAssignment: vi.fn().mockResolvedValue(assignment),
    submitAssignment: submitAssignmentMock,
}));

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={['/learn/assignments/5?course=1']}>
                    <Routes>
                        <Route path="/learn/assignments/:id" element={<AssignmentSubmitPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    submitAssignmentMock.mockClear();
});

it('shows the breadcrumb trail with the course and assignment title', async () => {
    renderPage();

    expect(await screen.findByText('Intro to Testing')).toBeInTheDocument();
    expect(screen.getAllByText('Project Submission').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Intro to Testing' })).toHaveAttribute('href', '/learn/courses/1');
});

it('updates the chosen filename and submits it as a real file upload', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('No file chosen')).toBeInTheDocument();

    const file = new File(['zip-bytes'], 'project.zip', { type: 'application/zip' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(await screen.findByText('project.zip')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit Assignment' }));

    expect(await screen.findByText(/Submission received/)).toBeInTheDocument();
    expect(submitAssignmentMock).toHaveBeenCalledWith(5, { file, text_content: undefined });
});

it('blocks submission with an inline error when no file is chosen', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('No file chosen');
    await user.click(screen.getByRole('button', { name: 'Submit Assignment' }));

    expect(await screen.findByText('Choose a file to submit.')).toBeInTheDocument();
    expect(submitAssignmentMock).not.toHaveBeenCalled();
});
