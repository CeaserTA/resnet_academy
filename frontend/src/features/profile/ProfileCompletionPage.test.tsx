import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileCompletionPage } from './ProfileCompletionPage';
import * as profileApi from '@/lib/api/profileApi';
import type { User } from '@/lib/api/types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock profile API
vi.mock('@/lib/api/profileApi', () => ({
    profileApi: {
        getStatus: vi.fn(),
        updateProfile: vi.fn(),
        uploadAvatar: vi.fn(),
    },
}));

// Mock useAuth hook
const mockRefetch = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

// Helper to create a test user
const createTestUser = (overrides?: Partial<User>): User => ({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    country: null,
    city: null,
    highest_qualification: null,
    bio: null,
    occupation: null,
    linkedin_profile: null,
    portfolio_website: null,
    avatar_url: null,
    role: 'student',
    status: 'active',
    email_verified_at: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
});

// Helper to wrap with providers
const renderWithProviders = (user: User) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    mockRefetch.mockResolvedValue(user);
    mockUseAuth.mockReturnValue({
        user,
        isLoading: false,
        isAuthenticated: true,
        refetch: mockRefetch,
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ProfileCompletionPage />
            </BrowserRouter>
        </QueryClientProvider>
    );
};

// Helper to fill in form fields
async function fillProfileForm(user: ReturnType<typeof userEvent.setup>) {
    const phoneInput = screen.getByLabelText(/phone number/i);
    const countryInput = screen.getByLabelText(/country/i);
    const cityInput = screen.getByLabelText(/city/i);

    await user.clear(phoneInput);
    await user.type(phoneInput, '+1 234 567 8900');
    await user.type(countryInput, 'United States');
    await user.type(cityInput, 'New York');
    
    // Open the Radix UI select and click option
    const qualificationSelect = screen.getByRole('combobox', { name: /highest qualification/i });
    await user.click(qualificationSelect);
    const bachelorOption = await screen.findByRole('option', { name: /bachelor's degree/i });
    await user.click(bachelorOption);
}

describe('ProfileCompletionPage - Return Redirect Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockRefetch.mockClear();
        vi.spyOn(profileApi.profileApi, 'getStatus').mockResolvedValue({
            percentage: 50,
            missing: ['phone', 'country', 'city', 'highest_qualification'],
            completed: ['name', 'email'],
        });
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    /**
     * **Validates: Requirement 7.2, 7.3 - Check for stored return URL and redirect to it**
     */
    it('redirects to stored returnUrl after successful profile completion', async () => {
        const user = userEvent.setup();
        const testUser = createTestUser();

        // Requirement 7.1: Store return URL (would be set by ApplicationModal)
        sessionStorage.setItem('returnUrl', '/courses/advanced-course');

        vi.spyOn(profileApi.profileApi, 'updateProfile').mockResolvedValue(testUser);

        renderWithProviders(testUser);

        // Fill in required fields
        await waitFor(() => {
            expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        });

        await fillProfileForm(user);

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(submitButton);

        // Requirement 7.3: Redirect to stored URL
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/courses/advanced-course');
        }, { timeout: 2000 });

        // Requirement 7.5: Clear stored return URL after use
        expect(sessionStorage.getItem('returnUrl')).toBeNull();
    });

    /**
     * **Validates: Requirement 7.4 - Redirect to dashboard if no return URL exists**
     */
    it('redirects to dashboard when no returnUrl is stored', async () => {
        const user = userEvent.setup();
        const testUser = createTestUser();

        // No returnUrl in sessionStorage
        expect(sessionStorage.getItem('returnUrl')).toBeNull();

        vi.spyOn(profileApi.profileApi, 'updateProfile').mockResolvedValue(testUser);

        renderWithProviders(testUser);

        // Fill in required fields
        await waitFor(() => {
            expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        });

        await fillProfileForm(user);

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(submitButton);

        // Requirement 7.4: Redirect to dashboard if no return URL
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        }, { timeout: 2000 });
    });

    /**
     * **Validates: Requirement 7.5 - Clear stored return URL after use**
     */
    it('clears returnUrl from sessionStorage after redirect', async () => {
        const user = userEvent.setup();
        const testUser = createTestUser();

        sessionStorage.setItem('returnUrl', '/courses/test-course');
        expect(sessionStorage.getItem('returnUrl')).toBe('/courses/test-course');

        vi.spyOn(profileApi.profileApi, 'updateProfile').mockResolvedValue(testUser);

        renderWithProviders(testUser);

        await waitFor(() => {
            expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        });

        await fillProfileForm(user);

        const submitButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(submitButton);

        // Wait for redirect and verify sessionStorage cleared
        await waitFor(() => {
            expect(sessionStorage.getItem('returnUrl')).toBeNull();
        }, { timeout: 2000 });
    });

    /**
     * Test that returnUrl is not cleared if profile update fails
     */
    it('preserves returnUrl in sessionStorage if profile update fails', async () => {
        const user = userEvent.setup();
        const testUser = createTestUser();

        sessionStorage.setItem('returnUrl', '/courses/test-course');

        // Mock API to fail
        vi.spyOn(profileApi.profileApi, 'updateProfile').mockRejectedValue(
            new Error('Network error')
        );

        renderWithProviders(testUser);

        await waitFor(() => {
            expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        });

        await fillProfileForm(user);

        const submitButton = screen.getByRole('button', { name: /save profile/i });
        await user.click(submitButton);

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText(/could not update profile/i)).toBeInTheDocument();
        });

        // returnUrl should still be in sessionStorage
        expect(sessionStorage.getItem('returnUrl')).toBe('/courses/test-course');

        // Should not have navigated
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    /**
     * Test that cancel button navigates to dashboard (not returnUrl)
     */
    it('cancel button navigates to dashboard regardless of returnUrl', async () => {
        const user = userEvent.setup();
        const testUser = createTestUser();

        sessionStorage.setItem('returnUrl', '/courses/test-course');

        renderWithProviders(testUser);

        await waitFor(() => {
            expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        // Cancel should go to dashboard, not returnUrl
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

        // returnUrl should still be in sessionStorage (not cleared by cancel)
        expect(sessionStorage.getItem('returnUrl')).toBe('/courses/test-course');
    });
});
