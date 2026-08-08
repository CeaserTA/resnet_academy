import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, describe } from 'vitest';
import { ProfileCompletionCard } from './ProfileCompletionCard';

describe('ProfileCompletionCard', () => {
    it('renders when percentage < 100', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={50}
                    missingFields={['phone', 'country']}
                    completedFields={['name', 'email']}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('Complete your profile')).toBeInTheDocument();
    });

    it('does not render when percentage = 100', () => {
        const { container } = render(
            <MemoryRouter>
                <ProfileCompletionCard percentage={100} missingFields={[]} completedFields={['name', 'email', 'phone', 'country']} />
            </MemoryRouter>,
        );

        expect(container.firstChild).toBeNull();
    });

    it('does not render when percentage > 100', () => {
        const { container } = render(
            <MemoryRouter>
                <ProfileCompletionCard percentage={120} missingFields={[]} completedFields={['name', 'email', 'phone', 'country']} />
            </MemoryRouter>,
        );

        expect(container.firstChild).toBeNull();
    });

    it('displays the percentage value as a numeric value', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={66.67}
                    missingFields={['phone', 'country']}
                    completedFields={['name', 'email', 'city', 'highest_qualification']}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('66.67%')).toBeInTheDocument();
    });

    it('displays a progress bar', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={75}
                    missingFields={['phone']}
                    completedFields={['name', 'email', 'country']}
                />
            </MemoryRouter>,
        );

        // Progress bar uses aria-valuenow from Radix
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('shows checklist with completed fields marked', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={50}
                    missingFields={['phone', 'country']}
                    completedFields={['name', 'email']}
                />
            </MemoryRouter>,
        );

        // Check that completed fields are displayed
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();

        // Check that missing fields are displayed
        expect(screen.getByText('Phone')).toBeInTheDocument();
        expect(screen.getByText('Country')).toBeInTheDocument();
    });

    it('formats field names correctly', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={33.33}
                    missingFields={['highest_qualification', 'phone']}
                    completedFields={['name']}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('Highest Qualification')).toBeInTheDocument();
        expect(screen.getByText('Phone')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('provides a "Complete Profile" button that navigates to /profile/complete', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={50}
                    missingFields={['phone', 'country']}
                    completedFields={['name', 'email']}
                />
            </MemoryRouter>,
        );

        const button = screen.getByRole('link', { name: 'Complete Profile' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('href', '/profile/complete');
    });

    it('has visually prominent styling with blue accent', () => {
        const { container } = render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={50}
                    missingFields={['phone', 'country']}
                    completedFields={['name', 'email']}
                />
            </MemoryRouter>,
        );

        // Check for prominent styling - border-l-4 border-l-blue-600
        const card = container.querySelector('.border-l-4.border-l-blue-600');
        expect(card).toBeInTheDocument();
    });

    it('handles empty completed fields list', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={0}
                    missingFields={['name', 'email', 'phone', 'country']}
                    completedFields={[]}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('handles multiple completed and missing fields', () => {
        render(
            <MemoryRouter>
                <ProfileCompletionCard
                    percentage={66.67}
                    missingFields={['phone', 'highest_qualification']}
                    completedFields={['name', 'email', 'country', 'city']}
                />
            </MemoryRouter>,
        );

        // All fields should be visible
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Country')).toBeInTheDocument();
        expect(screen.getByText('City')).toBeInTheDocument();
        expect(screen.getByText('Phone')).toBeInTheDocument();
        expect(screen.getByText('Highest Qualification')).toBeInTheDocument();
    });
});
