import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { CourseCard } from '@/features/catalogue/CourseCard';
import type { Course } from '@/lib/api/types';

const course: Course = {
    id: 1,
    title: 'Introduction to Laravel',
    slug: 'introduction-to-laravel',
    description: null,
    level: 'beginner',
    enrolment_policy: 'open',
    advisory_require_attestation: false,
    application_questions: null,
    application_allow_alternative_proof: true,
    application_require_portfolio_url: false,
    thumbnail_url: null,
    prerequisites_text: null,
    price: '50000.00',
    currency: 'UGX',
    status: 'published',
    current_version: 1,
    confirmation_delay_hours: 24,
    schedule_start_date: null,
    category: { id: 1, name: 'Web Development', slug: 'web-development', parent_id: null, created_at: '' },
    instructors: [
        {
            id: 2,
            role: 'instructor',
            name: 'Jane Doe',
            email: 'jane@resnet.test',
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
            email_verified_at: null,
            last_login_at: null,
            created_at: '',
        },
    ],
    created_at: '',
    updated_at: '',
};

it('renders the course title, level, category, and price', () => {
    render(
        <MemoryRouter>
            <CourseCard course={course} />
        </MemoryRouter>,
    );

    expect(screen.getByText('Introduction to Laravel')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Web Development')).toBeInTheDocument();
    expect(screen.getByText('UGX 50,000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Course' })).toHaveAttribute('href', '/courses/1');
});
