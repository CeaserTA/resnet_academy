import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi, beforeEach, describe } from 'vitest';
import { CourseDetailPage } from '@/features/catalogue/CourseDetailPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { Course, User } from '@/lib/api/types';

// Mock data that will be updated in tests
let mockCourseData: Course;
let mockSectionsData: any[];
let mockSectionsLoading: boolean;

// Mock the hooks
vi.mock('@/features/catalogue/useCourses', () => ({
    useCourse: vi.fn(() => ({
        data: mockCourseData,
        isLoading: false,
        isError: false,
    })),
    useCourseModules: vi.fn(() => ({
        data: [],
        isLoading: false,
    })),
}));

vi.mock('@/features/catalogue/useStudentSections', () => ({
    useStudentSections: vi.fn(() => ({
        openSections: mockSectionsData,
        isLoading: mockSectionsLoading,
    })),
}));

vi.mock('@/features/enrolment/useEnrolments', () => ({
    useEnrol: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false,
    })),
}));

vi.mock('@/features/courseApplications/useCourseApplications', () => ({
    useMyCourseApplications: vi.fn(() => ({
        data: [],
    })),
}));

// Mock profile status API (used by the pre-application profile completeness gate)
const { mockGetProfileStatus } = vi.hoisted(() => ({ mockGetProfileStatus: vi.fn() }));
vi.mock('@/lib/api/profileApi', () => ({
    profileApi: {
        getStatus: mockGetProfileStatus,
    },
}));

// Mock ApplicationModal so tests can simulate submission without the real form
vi.mock('@/features/catalogue/ApplicationModal', () => ({
    ApplicationModal: ({ onSubmitted }: { onSubmitted: () => void }) => (
        <div data-testid="application-modal">
            <button onClick={onSubmitted}>Submit Mock Application</button>
        </div>
    ),
}));

vi.mock('@/lib/auth/AuthContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/AuthContext')>();
    return {
        ...actual,
        useAuth: vi.fn(() => ({
            user: mockAuthUser,
            isAuthenticated: mockAuthUser !== null,
        })),
    };
});

const mockStudent: User = {
    id: 1,
    role: 'student',
    name: 'Test Student',
    first_name: 'Test',
    last_name: 'Student',
    email: 'student@test.com',
    phone: null,
    avatar_url: null,
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
    email_verified_at: null,
    last_login_at: null,
    created_at: '2024-01-01T00:00:00Z',
};

const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    slug: 'test-course',
    description: 'A test course',
    level: 'beginner',
    enrolment_policy: 'application',
    advisory_require_attestation: false,
    application_questions: ['Question 1'],
    application_allow_alternative_proof: true,
    application_require_portfolio_url: false,
    sections_required: true,
    thumbnail_url: null,
    prerequisites_text: null,
    price: '100.00',
    currency: 'UGX',
    status: 'published',
    current_version: 1,
    confirmation_delay_hours: 24,
    schedule_start_date: null,
    category: null,
    instructors: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

// Initialize mock data
mockCourseData = { ...mockCourse };
mockSectionsData = [];
mockSectionsLoading = false;

// Mutable auth user — tests can switch between authenticated student and guest
let mockAuthUser: User | null = mockStudent;

const completeProfileStatus = {
    percentage: 100,
    missing: [],
    completed: ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'],
};

function renderPage(initialEntries: string[] = ['/courses/1']) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={initialEntries}>
                    <Routes>
                        <Route path="/courses/:id" element={<CourseDetailPage />} />
                        <Route path="/login" element={<div>Login page</div>} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

describe('CourseDetailPage - Application Submission Confirmation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthUser = mockStudent;
        mockGetProfileStatus.mockResolvedValue(completeProfileStatus);
        sessionStorage.clear();
    });

    it('shows success alert after application submission', async () => {
        const user = userEvent.setup();

        renderPage();

        // Open application modal
        const applyButton = await screen.findByText('Apply to enrol');
        await user.click(applyButton);

        // Submit application (mock)
        const submitButton = screen.getByText('Submit Mock Application');
        await user.click(submitButton);

        // Check that success alert appears
        await waitFor(() => {
            expect(screen.getByText(/Application submitted!/)).toBeInTheDocument();
            expect(screen.getByText(/Check your dashboard to track its status/)).toBeInTheDocument();
        });
    });

    it('allows manual dismissal of success alert', async () => {
        const user = userEvent.setup();

        renderPage();

        const applyButton = await screen.findByText('Apply to enrol');
        await user.click(applyButton);

        const submitButton = screen.getByText('Submit Mock Application');
        await user.click(submitButton);

        // Wait for alert to appear
        await waitFor(() => {
            expect(screen.getByText(/Application submitted!/)).toBeInTheDocument();
        });

        // Find and click dismiss button (Alert component should have a dismiss button)
        const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
        await user.click(dismissButton);

        // Alert should be gone
        await waitFor(() => {
            expect(screen.queryByText(/Application submitted!/)).not.toBeInTheDocument();
        });
    });

    it('auto-dismisses success alert after 5 seconds', async () => {
        // Fake timers break findByText/waitFor polling, so drive the flow with
        // synchronous fireEvent + act instead, and always restore real timers.
        vi.useFakeTimers();
        try {
            renderPage();

            // Course data is mocked synchronously, so the CTA renders immediately
            await act(async () => {
                fireEvent.click(screen.getByText('Apply to enrol'));
            });

            await act(async () => {
                fireEvent.click(screen.getByText('Submit Mock Application'));
            });

            // Alert should appear
            expect(screen.getByText(/Application submitted!/)).toBeInTheDocument();

            // Fast-forward 5 seconds
            await act(async () => {
                vi.advanceTimersByTime(5000);
            });

            // Alert should be gone
            expect(screen.queryByText(/Application submitted!/)).not.toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('CourseDetailPage - CTA Gating with sections_required', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthUser = mockStudent;
        mockGetProfileStatus.mockResolvedValue(completeProfileStatus);
        sessionStorage.clear();
        // Reset to defaults
        mockSectionsData = [];
        mockSectionsLoading = false;
        mockCourseData = { ...mockCourse };
    });

    it('sections_required=false + sections exist + none selected → CTA enabled', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: false };
        mockSectionsData = [
            { id: 1, name: 'Section A', status: 'open' as const, start_date: '2024-02-01', capacity: 30, enrolled_count: 15 },
        ];

        renderPage();

        // CTA should be enabled
        const enrolButton = await screen.findByText('Enrol now');
        expect(enrolButton).not.toBeDisabled();
    });

    it('sections_required=true + sections exist + none selected → CTA disabled', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: true };
        mockSectionsData = [
            { id: 1, name: 'Section A', status: 'open' as const, start_date: '2024-02-01', capacity: 30, enrolled_count: 15 },
        ];

        renderPage();

        // CTA should be disabled
        const enrolButton = await screen.findByText('Enrol now');
        expect(enrolButton).toBeDisabled();
    });

    it('sections_required=true + sections exist + one selected → CTA enabled', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: true };
        mockSectionsData = [
            { id: 1, name: 'Section A', status: 'open' as const, start_date: '2024-02-01', capacity: 30, enrolled_count: 15 },
        ];

        renderPage();

        // Select a section
        const user = userEvent.setup();
        const sectionButton = await screen.findByText('Section A');
        await user.click(sectionButton);

        // CTA should now be enabled
        await waitFor(() => {
            const enrolButton = screen.getByText('Enrol now');
            expect(enrolButton).not.toBeDisabled();
        });
    });

    it('sections_required=false + no sections → CTA enabled, picker hidden', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: false };
        mockSectionsData = [];

        renderPage();

        // CTA should be enabled
        const enrolButton = await screen.findByText('Enrol now');
        expect(enrolButton).not.toBeDisabled();

        // Section picker should not be visible
        expect(screen.queryByTestId('sections-loading')).not.toBeInTheDocument();
    });

    it('sections loading → CTA disabled regardless of sections_required', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: false };
        mockSectionsData = [];
        mockSectionsLoading = true; // Loading state

        renderPage();

        // CTA should be disabled during load
        const enrolButton = await screen.findByText('Enrol now');
        expect(enrolButton).toBeDisabled();

        // Loading skeleton should be visible
        expect(screen.getByTestId('sections-loading')).toBeInTheDocument();
    });

    it('shows helper text when sections_required=false and sections exist', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: false };
        mockSectionsData = [
            { id: 1, name: 'Section A', status: 'open' as const, start_date: '2024-02-01', capacity: 30, enrolled_count: 15 },
        ];

        renderPage();

        // Helper text should be visible
        await waitFor(() => {
            expect(screen.getByText(/Optional: choose a section to join a cohort, or enroll self-paced below/i)).toBeInTheDocument();
        });
    });

    it('does not show helper text when sections_required=true', async () => {
        mockCourseData = { ...mockCourse, enrolment_policy: 'open', sections_required: true };
        mockSectionsData = [
            { id: 1, name: 'Section A', status: 'open' as const, start_date: '2024-02-01', capacity: 30, enrolled_count: 15 },
        ];

        renderPage();

        // Helper text should NOT be visible
        await waitFor(() => {
            expect(screen.queryByText(/Optional: choose a section to join a cohort, or enroll self-paced below/i)).not.toBeInTheDocument();
        });
    });
});

describe('CourseDetailPage - Application Journey & State Retention', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthUser = mockStudent;
        mockGetProfileStatus.mockResolvedValue(completeProfileStatus);
        mockSectionsData = [];
        mockSectionsLoading = false;
        mockCourseData = { ...mockCourse };
        sessionStorage.clear();
    });

    it('blocks the application modal and shows profile completion when the profile is incomplete', async () => {
        mockGetProfileStatus.mockResolvedValue({
            percentage: 50,
            missing: ['phone', 'city'],
            completed: ['name', 'email', 'country', 'highest_qualification'],
        });
        const user = userEvent.setup();

        renderPage();

        await user.click(await screen.findByText('Apply to enrol'));

        // Profile completion modal opens instead of the application modal
        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Complete your profile' })).toBeInTheDocument();
        });
        expect(screen.queryByTestId('application-modal')).not.toBeInTheDocument();
        // returnUrl points back to this course with the apply action
        expect(sessionStorage.getItem('returnUrl')).toBe('/courses/1?action=apply');
    });

    it('opens the application modal directly when the profile is complete', async () => {
        const user = userEvent.setup();

        renderPage();

        await user.click(await screen.findByText('Apply to enrol'));

        expect(await screen.findByTestId('application-modal')).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: 'Complete your profile' })).not.toBeInTheDocument();
    });

    it('saves guest intent and redirects to login when unauthenticated', async () => {
        mockAuthUser = null;
        const user = userEvent.setup();

        renderPage();

        await user.click(await screen.findByText('Apply to enrol'));

        await waitFor(() => {
            expect(JSON.parse(sessionStorage.getItem('pending_enrolment_intent') ?? 'null')).toEqual({
                courseId: 1,
                action: 'apply',
            });
        });
        // Navigated to /login
        await waitFor(() => {
            expect(screen.getByText('Login page')).toBeInTheDocument();
        });
    });

    it('auto-resumes the application flow when guest intent matches the current course', async () => {
        sessionStorage.setItem('pending_enrolment_intent', JSON.stringify({ courseId: 1, action: 'apply' }));

        renderPage();

        // Application modal opens automatically and the intent is consumed
        expect(await screen.findByTestId('application-modal')).toBeInTheDocument();
        expect(sessionStorage.getItem('pending_enrolment_intent')).toBeNull();
    });

    it('ignores guest intent for a different course', async () => {
        sessionStorage.setItem('pending_enrolment_intent', JSON.stringify({ courseId: 999, action: 'apply' }));

        renderPage();

        await screen.findByText('Apply to enrol');
        expect(screen.queryByTestId('application-modal')).not.toBeInTheDocument();
        // Intent for another course is left untouched
        expect(sessionStorage.getItem('pending_enrolment_intent')).not.toBeNull();
    });

    it('auto-resumes the application flow when returning with the action=apply query param', async () => {
        renderPage(['/courses/1?action=apply']);

        expect(await screen.findByTestId('application-modal')).toBeInTheDocument();
    });
});
