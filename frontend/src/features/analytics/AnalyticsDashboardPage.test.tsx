import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { AnalyticsDashboardPage } from '@/features/analytics/AnalyticsDashboardPage';
import type { Course, CourseAnalytics } from '@/lib/api/types';

const { course, analytics } = vi.hoisted(() => {
    const course: Course = {
        id: 1,
        title: 'Intro to Testing',
        slug: 'intro-to-testing',
        description: null,
        level: 'beginner',
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

    const analytics: CourseAnalytics = {
        total_students: 4,
        completed_students: 1,
        completion_rate: 25,
        at_risk_students: [
            {
                student: { id: 2, name: 'Quiet Student', email: 'quiet@example.com' },
                enrolled_at: '2026-01-01T00:00:00Z',
                last_engaged_at: null,
            },
        ],
        engagement_summary: { resource_viewed: 12, assignment_submitted: 3 },
    };

    return { course, analytics };
});

vi.mock('@/features/catalogue/api', () => ({
    fetchCourse: vi.fn().mockResolvedValue(course),
}));

vi.mock('@/features/analytics/api', () => ({
    fetchCourseAnalytics: vi.fn().mockResolvedValue(analytics),
}));

it('shows completion rate, engagement counts, and the at-risk student list', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/admin/courses/1/analytics']}>
                <Routes>
                    <Route path="/admin/courses/:id/analytics" element={<AnalyticsDashboardPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    expect(await screen.findByText('25%')).toBeInTheDocument();
    expect(screen.getByText('1 of 4 completed')).toBeInTheDocument();
    expect(screen.getByText('Quiet Student')).toBeInTheDocument();
    expect(screen.getByText('Never engaged')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
});
