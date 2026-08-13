/**
 * Tests for:
 * - SectionPicker component (T1–T5, T11)
 * - CourseDetailPage section gating behaviour (T6–T7, T12)
 * - enrolInCourse API payload shape (T8–T9)
 * - submitCourseApplication API payload shape (T10)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SectionPicker } from './SectionPicker';
import { CourseDetailPage } from './CourseDetailPage';
import { enrolInCourse } from '@/features/enrolment/api';
import { submitCourseApplication } from '@/features/courseApplications/api';
import { CourseSectionStatus } from '@/features/sections/types';
import type { CourseSection } from '@/features/sections/types';
import type { Course } from '@/lib/api/types';

// ─── Shared test factories ────────────────────────────────────────────────────

function makeSection(overrides: Partial<CourseSection> = {}): CourseSection {
    return {
        id: 1,
        course_id: 10,
        name: 'Cohort A',
        start_date: '2026-09-01',
        end_date: '2026-11-30',
        application_deadline: undefined,
        capacity: 30,
        seats_taken: 10,
        status: CourseSectionStatus.Open,
        primary_instructor_id: undefined,
        primary_instructor: undefined,
        enrolled_count: undefined,       // Analytics fields optional for students/guests
        waitlisted_count: undefined,
        applications_pending_count: undefined,
        is_full: false,
        is_accepting_applications: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function makeCourse(overrides: Partial<Course> = {}): Course {
    return {
        id: 10,
        title: 'Full Stack Development',
        slug: 'full-stack',
        description: 'Learn full-stack dev.',
        level: 'intermediate',
        enrolment_policy: 'open',
        advisory_require_attestation: false,
        application_questions: null,
        application_allow_alternative_proof: false,
        application_require_portfolio_url: false,
        thumbnail_url: null,
        prerequisites_text: null,
        price: '150000.00',
        currency: 'UGX',
        status: 'published',
        current_version: 1,
        confirmation_delay_hours: 24,
        schedule_start_date: null,
        category: null,
        instructors: [],
        created_at: '',
        updated_at: '',
        ...overrides,
    };
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock react-router navigate so CourseDetailPage renders without routing issues
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: '10' }) };
});

// Mock auth — logged-in student by default
vi.mock('@/lib/auth/AuthContext', () => ({
    useAuth: () => ({ user: { id: 1, role: 'student', name: 'Test Student' }, isLoading: false }),
}));

// Mock useCourse and useCourseModules so the page renders with our test course
const mockUseCourse = vi.fn();
const mockUseCourseModules = vi.fn(() => ({ data: [], isLoading: false }));
vi.mock('@/features/catalogue/useCourses', () => ({
    useCourse: (...args: unknown[]) => mockUseCourse(...args),
    useCourseModules: (...args: unknown[]) => mockUseCourseModules(...args),
}));

// Mock useMyCourseApplications — no pending applications
vi.mock('@/features/courseApplications/useCourseApplications', () => ({
    useMyCourseApplications: () => ({ data: [] }),
    useSubmitCourseApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Mock useStudentSections — we control what it returns per test
const mockUseStudentSections = vi.fn();
vi.mock('@/features/catalogue/useStudentSections', () => ({
    useStudentSections: (...args: unknown[]) => mockUseStudentSections(...args),
}));

// Mock useEnrol — capture call args
const mockEnrolMutateAsync = vi.fn();
vi.mock('@/features/enrolment/useEnrolments', () => ({
    useEnrol: () => ({ mutateAsync: mockEnrolMutateAsync, isPending: false }),
}));

// Mock the raw API functions for payload-shape tests
vi.mock('@/features/enrolment/api');
vi.mock('@/features/courseApplications/api');

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderPicker(props: {
    sections: CourseSection[];
    selectedId: number | null;
    onSelect?: (id: number) => void;
}) {
    return render(
        <SectionPicker
            sections={props.sections}
            selectedId={props.selectedId}
            onSelect={props.onSelect ?? vi.fn()}
        />,
    );
}

function renderDetailPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/courses/10']}>
                <CourseDetailPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SectionPicker', () => {
    // T1 — renders and lists open sections with all required fields
    it('renders section name, date range, and instructor when provided', () => {
        const sections = [
            makeSection({
                id: 1,
                name: 'Cohort A',
                start_date: '2026-09-01',
                end_date: '2026-11-30',
                primary_instructor: { id: 5, name: 'Alice Instructor', email: 'alice@test.com' },
            }),
            makeSection({
                id: 2,
                name: 'Cohort B',
                start_date: '2026-10-01',
                end_date: '2026-12-31',
                primary_instructor: undefined,
            }),
        ];

        renderPicker({ sections, selectedId: null });

        expect(screen.getByText('Cohort A')).toBeInTheDocument();
        expect(screen.getByText('Cohort B')).toBeInTheDocument();
        // Instructor shown for section 1, not for section 2
        expect(screen.getByText('Alice Instructor')).toBeInTheDocument();
    });

    // T2 — full section shows waitlist label but is still clickable
    it('shows "Full — waitlist" badge on a full section and still allows selection', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const fullSection = makeSection({ id: 3, name: 'Full Cohort', is_full: true, seats_taken: 30, capacity: 30 });

        renderPicker({ sections: [fullSection], selectedId: null, onSelect });

        // Waitlist label present
        expect(screen.getByText(/full.*waitlist/i)).toBeInTheDocument();

        // The row is still clickable
        await user.click(screen.getByTestId('section-option-3'));
        expect(onSelect).toHaveBeenCalledWith(3);
    });

    // T3 — selecting calls onSelect with the correct id
    it('calls onSelect with the correct section id when a row is clicked', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const sections = [
            makeSection({ id: 10, name: 'First Cohort' }),
            makeSection({ id: 11, name: 'Second Cohort' }),
        ];

        renderPicker({ sections, selectedId: null, onSelect });

        await user.click(screen.getByTestId('section-option-11'));
        expect(onSelect).toHaveBeenCalledWith(11);
        expect(onSelect).not.toHaveBeenCalledWith(10);
    });

    // T4 — selected section has aria-checked=true, others do not
    it('marks the selected section with aria-checked and leaves others unchecked', () => {
        const sections = [
            makeSection({ id: 20, name: 'Alpha Cohort' }),
            makeSection({ id: 21, name: 'Beta Cohort' }),
        ];

        renderPicker({ sections, selectedId: 20 });

        expect(screen.getByTestId('section-option-20')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('section-option-21')).toHaveAttribute('aria-checked', 'false');
    });

    // T5 — renders nothing when sections array is empty
    it('renders nothing when sections array is empty', () => {
        const { container } = renderPicker({ sections: [], selectedId: null });
        expect(container.firstChild).toBeNull();
    });

    // T11 — application deadline shown only when present
    it('shows application deadline only when set on the section', () => {
        const sections = [
            makeSection({ id: 30, name: 'With Deadline', application_deadline: '2026-08-25' }),
            makeSection({ id: 31, name: 'No Deadline', application_deadline: undefined }),
        ];

        renderPicker({ sections, selectedId: null });

        // "Apply by" appears only once (for section 30)
        const deadlineEls = screen.queryAllByText(/apply by/i);
        expect(deadlineEls).toHaveLength(1);
    });

    // T2b — full section is not disabled (no pointer-events-none / disabled attribute)
    it('does not set disabled attribute on a full section row', () => {
        const fullSection = makeSection({ id: 40, name: 'Full Cohort', is_full: true });
        renderPicker({ sections: [fullSection], selectedId: null });
        const row = screen.getByTestId('section-option-40');
        expect(row).not.toBeDisabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('CourseDetailPage — section gating', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCourse.mockReturnValue({ data: makeCourse(), isLoading: false, isError: false });
    });

    // T6 — CTA disabled until a section is selected (when sections exist)
    it('disables the enrol CTA until a section is selected', async () => {
        const user = userEvent.setup();
        const section = makeSection({ id: 1, name: 'Cohort A' });

        mockUseStudentSections.mockReturnValue({
            sections: [section],
            openSections: [section],
            isLoading: false,
            isError: false,
        });

        renderDetailPage();

        // Button exists but is disabled initially
        const button = await screen.findByRole('button', { name: /enrol now/i });
        expect(button).toBeDisabled();

        // Select a section
        await user.click(screen.getByTestId('section-option-1'));

        // Button should now be enabled
        expect(button).not.toBeDisabled();
    });

    // T7 — no picker and CTA enabled when course has zero open sections
    it('skips the section picker and enables the CTA when no sections exist', async () => {
        mockUseStudentSections.mockReturnValue({
            sections: [],
            openSections: [],
            isLoading: false,
            isError: false,
        });

        renderDetailPage();

        const button = await screen.findByRole('button', { name: /enrol now/i });
        expect(button).not.toBeDisabled();

        // Section picker must not be in the DOM
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });

    // T12 — CTA blocked (not enabled) while sections are still loading
    it('keeps the CTA disabled while sections are loading', async () => {
        mockUseStudentSections.mockReturnValue({
            sections: [],
            openSections: [],
            isLoading: true, // still fetching
            isError: false,
        });

        renderDetailPage();

        const button = await screen.findByRole('button', { name: /enrol now/i });
        expect(button).toBeDisabled();

        // Loading skeleton should be visible
        expect(screen.getByTestId('sections-loading')).toBeInTheDocument();
    });

    // T6b — section_id threaded into enrol mutation when a section is selected
    it('calls enrol mutation with correct courseId and sectionId after section selection', async () => {
        const user = userEvent.setup();
        const section = makeSection({ id: 7, name: 'Cohort G' });
        mockEnrolMutateAsync.mockResolvedValue({});

        mockUseStudentSections.mockReturnValue({
            sections: [section],
            openSections: [section],
            isLoading: false,
            isError: false,
        });

        renderDetailPage();

        // Select section
        await user.click(await screen.findByTestId('section-option-7'));

        // Click enrol
        const button = screen.getByRole('button', { name: /enrol now/i });
        await user.click(button);

        await waitFor(() => {
            expect(mockEnrolMutateAsync).toHaveBeenCalledWith({ courseId: 10, sectionId: 7 });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('API payload shape', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // T8 — section_id included in enrolment when provided
    it('enrolInCourse includes section_id in POST body when sectionId is given', async () => {
        const mockPost = vi.mocked(enrolInCourse);
        mockPost.mockResolvedValue({} as never);

        await enrolInCourse(42, 7);

        expect(mockPost).toHaveBeenCalledWith(42, 7);
    });

    // T9 — section_id omitted from enrolment when undefined
    it('enrolInCourse omits section_id when sectionId is undefined', async () => {
        const mockPost = vi.mocked(enrolInCourse);
        mockPost.mockResolvedValue({} as never);

        await enrolInCourse(42, undefined);

        expect(mockPost).toHaveBeenCalledWith(42, undefined);
    });

    // T10 — section_id included in application submission when provided
    it('submitCourseApplication includes section_id when given', async () => {
        const mockSubmit = vi.mocked(submitCourseApplication);
        mockSubmit.mockResolvedValue({} as never);

        await submitCourseApplication({ course_id: 42, section_id: 7, answers: [] });

        expect(mockSubmit).toHaveBeenCalledWith({
            course_id: 42,
            section_id: 7,
            answers: [],
        });
    });
});
