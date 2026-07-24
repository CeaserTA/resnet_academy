import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { CoursePlayerPage } from '@/features/learning/CoursePlayerPage';
import { AuthProvider } from '@/lib/auth/AuthContext';
import type { Course, Module, ModuleProgressEntry, User } from '@/lib/api/types';

const { course, modules, progress, student } = vi.hoisted(() => {
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

    const modules: Module[] = [
        {
            id: 1,
            course_id: 1,
            title: 'Module 1',
            description: null,
            order_index: 1,
            scheduled_start_at: null,
            group_ids: [],
            status: 'not_started',
            items: [
                {
                    item_type: 'resource',
                    id: 10,
                    module_id: 1,
                    type: 'reading',
                    title: 'Welcome',
                    description: null,
                    is_required: true,
                    order_index: 1,
                    is_complete: false,
                    details: {},
                },
            ],
        },
        {
            id: 2,
            course_id: 1,
            title: 'Module 2',
            description: null,
            order_index: 2,
            scheduled_start_at: null,
            group_ids: [],
            status: 'locked',
            items: [
                {
                    item_type: 'resource',
                    id: 20,
                    module_id: 2,
                    type: 'reading',
                    title: 'Locked lesson',
                    description: null,
                    is_required: true,
                    order_index: 1,
                    is_complete: false,
                    details: {},
                },
            ],
        },
    ];

    const progress: ModuleProgressEntry[] = [
        {
            module_id: 1,
            module_title: 'Module 1',
            order_index: 1,
            status: 'not_started',
            unlocked_at: null,
            completed_at: null,
        },
        {
            module_id: 2,
            module_title: 'Module 2',
            order_index: 2,
            status: 'locked',
            unlocked_at: null,
            completed_at: null,
        },
    ];

    const student: User = {
        id: 1,
        role: 'student',
        name: 'Test Student',
        email: 'student@example.com',
        phone: null,
        avatar_url: null,
        status: 'active',
        email_verified_at: '2026-01-01T00:00:00Z',
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
    };

    return { course, modules, progress, student };
});

vi.mock('@/features/catalogue/api', () => ({
    fetchCourse: vi.fn().mockResolvedValue(course),
    fetchCourses: vi.fn(),
    fetchCategories: vi.fn(),
}));

vi.mock('@/features/courseStructure/api', () => ({
    fetchModules: vi.fn().mockResolvedValue(modules),
}));

vi.mock('@/features/learning/api', () => ({
    fetchCourseProgress: vi.fn().mockResolvedValue(progress),
}));

vi.mock('@/features/auth/api', () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(student),
}));

it('shows an unlocked module’s resources but hides a locked module’s resources', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={['/learn/courses/1']}>
                    <Routes>
                        <Route path="/learn/courses/:id" element={<CoursePlayerPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>,
    );

    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(screen.queryByText('Locked lesson')).not.toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
});
