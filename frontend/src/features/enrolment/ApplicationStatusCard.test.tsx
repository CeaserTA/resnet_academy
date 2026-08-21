import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ApplicationStatusCard } from '@/features/enrolment/ApplicationStatusCard';
import type { Course, CourseApplication } from '@/lib/api/types';

function makeCourse(id: number, title: string): Course {
    return {
        id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        description: null,
        level: 'beginner',
        enrolment_policy: 'application',
        advisory_require_attestation: false,
        application_questions: null,
        application_allow_alternative_proof: true,
        application_require_portfolio_url: false,
        sections_required: false,
        thumbnail_url: null,
        prerequisites_text: null,
        price: '0',
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
}

function makeApplication(overrides: Partial<CourseApplication>): CourseApplication {
    return {
        id: 1,
        status: 'pending',
        student: null as unknown as CourseApplication['student'],
        course: makeCourse(1, 'Search Engine Optimisation'),
        section: null,
        answers: null,
        portfolio_url: null,
        alternative_proof_text: null,
        rejection_reason: null,
        dismissed_at: null,
        recommended_courses: [],
        reviewer: null,
        applied_at: '2026-08-03T00:00:00Z',
        reviewed_at: null,
        ...overrides,
    };
}

function renderCard(application: CourseApplication, onDismiss?: () => void) {
    return render(
        <MemoryRouter>
            <ApplicationStatusCard application={application} onDismiss={onDismiss} />
        </MemoryRouter>,
    );
}

it('shows only the badge, course title, and applied date for a pending application', () => {
    renderCard(makeApplication({ status: 'pending' }));

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Search Engine Optimisation')).toBeInTheDocument();
    expect(screen.queryByText(/Contact support/)).not.toBeInTheDocument();
});

it('shows the rejection reason, recommended course link, and support link for a rejected application', () => {
    renderCard(
        makeApplication({
            status: 'rejected',
            rejection_reason: 'This course requires prior experience in web fundamentals.',
            recommended_courses: [makeCourse(2, 'Frontend Development')],
        }),
    );

    expect(screen.getByText('Not accepted')).toBeInTheDocument();
    expect(screen.getByText('This course requires prior experience in web fundamentals.')).toBeInTheDocument();
    const startLink = screen.getByRole('link', { name: /Start Frontend Development/ });
    expect(startLink).toHaveAttribute('href', '/courses/2');
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', '/tickets');
});

it('renders nothing for an approved application', () => {
    const { container } = renderCard(makeApplication({ status: 'approved' }));

    expect(container).toBeEmptyDOMElement();
});

it('shows a dismiss control for a rejected application and fires onDismiss when clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderCard(makeApplication({ status: 'rejected' }), onDismiss);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledOnce();
});

it('does not show a dismiss control for a pending application', () => {
    renderCard(makeApplication({ status: 'pending' }), vi.fn());

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
});

it('displays section name for cohort applications', () => {
    renderCard(
        makeApplication({
            status: 'pending',
            section: { id: 1, name: 'Summer 2026 Intensive', status: 'open' },
        }),
    );

    expect(screen.getByText(/Section: Summer 2026 Intensive/)).toBeInTheDocument();
});

it('does not display section text for self-paced applications', () => {
    renderCard(
        makeApplication({
            status: 'pending',
            section: null,
        }),
    );

    expect(screen.queryByText(/Section:/)).not.toBeInTheDocument();
});

it('displays section name for rejected cohort applications', () => {
    renderCard(
        makeApplication({
            status: 'rejected',
            section: { id: 2, name: 'Fall 2026', status: 'open' },
            rejection_reason: 'Application not accepted.',
        }),
    );

    expect(screen.getByText(/Section: Fall 2026/)).toBeInTheDocument();
    expect(screen.getByText('Not accepted')).toBeInTheDocument();
});
