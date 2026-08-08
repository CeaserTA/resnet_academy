import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApplicationModal } from './ApplicationModal';
import { ApiError } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock the hook
const mockMutateAsync = vi.fn();
vi.mock('@/features/courseApplications/useCourseApplications', () => ({
    useSubmitCourseApplication: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    }),
}));

// Helper to create a test course
const createTestCourse = (overrides?: Partial<Course>): Course => ({
    id: 1,
    title: 'Test Course',
    slug: 'test-course',
    description: 'Test description',
    level: 'beginner' as const,
    enrolment_policy: 'application' as const,
    advisory_require_attestation: false,
    application_questions: null,
    application_allow_alternative_proof: false,
    application_require_portfolio_url: false,
    thumbnail_url: null,
    prerequisites_text: null,
    price: '0.00',
    currency: 'USD',
    status: 'published' as const,
    current_version: 1,
    confirmation_delay_hours: 24,
    schedule_start_date: null,
    category: { id: 1, name: 'Test Category', slug: 'test-category', parent_id: null, created_at: '' },
    instructors: [],
    created_at: '',
    updated_at: '',
    ...overrides,
});

// Helper to wrap with providers
const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>{component}</BrowserRouter>
        </QueryClientProvider>,
    );
};

describe('ApplicationModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmitted = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockMutateAsync.mockReset();
        sessionStorage.clear();
    });

    /**
     * **Validates: Requirement 5.2, 5.3 - Display profile incomplete error**
     */
    it('displays profile incomplete error when 403 with profile_incomplete code is received', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        // Mock API error response
        const apiError = new ApiError(
            403,
            'profile_incomplete',
            'Please complete your profile before applying for this course.',
            null,
            ['phone', 'country', 'city']
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        // Submit the application
        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        // Wait for error to be displayed
        await waitFor(() => {
            expect(screen.getByText(/please complete your profile before applying/i)).toBeInTheDocument();
        });

        // Verify missing fields are displayed
        expect(screen.getByText(/missing fields:/i)).toBeInTheDocument();
        expect(screen.getByText(/phone/i)).toBeInTheDocument();
        expect(screen.getByText(/country/i)).toBeInTheDocument();
        expect(screen.getByText(/city/i)).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 5.4 - Provide "Complete Profile" button**
     */
    it('shows "Complete Profile" button when profile is incomplete', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        const apiError = new ApiError(
            403,
            'profile_incomplete',
            'Please complete your profile before applying for this course.',
            null,
            ['phone']
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        // Initially shows submit button
        expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();

        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        // After error, shows complete profile button
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
        });

        // Submit button should be gone
        expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 7.1 - Store return URL in sessionStorage**
     */
    it('stores the current URL in sessionStorage when profile incomplete error occurs', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        // Set window location
        Object.defineProperty(window, 'location', {
            value: { pathname: '/courses/test-course' },
            writable: true,
        });

        const apiError = new ApiError(
            403,
            'profile_incomplete',
            'Please complete your profile before applying for this course.',
            null,
            ['phone']
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(sessionStorage.getItem('returnUrl')).toBe('/courses/test-course');
        });
    });

    /**
     * **Validates: Requirement 5.4 - Navigate to profile completion page**
     */
    it('navigates to profile completion page when "Complete Profile" is clicked', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        const apiError = new ApiError(
            403,
            'profile_incomplete',
            'Please complete your profile before applying for this course.',
            null,
            ['phone']
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        // Trigger error
        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        // Click complete profile button
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
        });

        const completeProfileButton = screen.getByRole('button', { name: /complete profile/i });
        await user.click(completeProfileButton);

        // Verify navigation
        expect(mockNavigate).toHaveBeenCalledWith('/profile/complete');
        expect(mockOnClose).toHaveBeenCalled();
    });

    /**
     * Test that application form is hidden when profile incomplete error is shown
     */
    it('hides the application form when profile incomplete error is displayed', async () => {
        const course = createTestCourse({
            application_questions: ['Why do you want to join?'],
        });
        const user = userEvent.setup();

        const apiError = new ApiError(
            403,
            'profile_incomplete',
            'Please complete your profile before applying for this course.',
            null,
            ['phone']
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        // Initially shows application form
        expect(screen.getByLabelText(/why do you want to join/i)).toBeInTheDocument();

        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        // After error, form should be hidden
        await waitFor(() => {
            expect(screen.queryByLabelText(/why do you want to join/i)).not.toBeInTheDocument();
        });
    });

    /**
     * Test that other API errors are still displayed normally
     */
    it('displays generic errors for non-profile-incomplete errors', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        const apiError = new ApiError(
            500,
            'server_error',
            'Internal server error',
            null
        );
        mockMutateAsync.mockRejectedValueOnce(apiError);

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Internal server error')).toBeInTheDocument();
        });

        // Should NOT show profile incomplete UI
        expect(screen.queryByText(/complete profile/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/missing fields/i)).not.toBeInTheDocument();
    });

    /**
     * Test successful application submission (no errors)
     */
    it('calls onSubmitted when application is successful', async () => {
        const course = createTestCourse();
        const user = userEvent.setup();

        mockMutateAsync.mockResolvedValueOnce({ id: 1 });

        renderWithProviders(
            <ApplicationModal course={course} onClose={mockOnClose} onSubmitted={mockOnSubmitted} />
        );

        const submitButton = screen.getByRole('button', { name: /submit application/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockOnSubmitted).toHaveBeenCalled();
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
