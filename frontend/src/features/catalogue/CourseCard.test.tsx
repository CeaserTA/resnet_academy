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
            status: 'active',
            email_verified_at: null,
            last_login_at: null,
            created_at: '',
        },
    ],
    created_at: '',
    updated_at: '',
};

it('renders the course title, level, category, and instructor', () => {
    render(
        <MemoryRouter>
            <CourseCard course={course} />
        </MemoryRouter>,
    );

    expect(screen.getByText('Introduction to Laravel')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Web Development')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
});
