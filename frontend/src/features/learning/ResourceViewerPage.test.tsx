import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi } from 'vitest';
import { ResourceViewerPage } from '@/features/learning/ResourceViewerPage';
import type { Module, ResourceItem } from '@/lib/api/types';

const { firstResource, secondResource, modules } = vi.hoisted(() => {
    const firstResource: ResourceItem = {
        id: 10,
        module_id: 1,
        type: 'document',
        title: 'Intro document',
        description: null,
        is_required: true,
        order_index: 1,
        is_complete: false,
        details: { file_url: 'https://example.com/intro.pdf' },
    };

    const secondResource: ResourceItem = {
        id: 11,
        module_id: 1,
        type: 'document',
        title: 'Follow-up document',
        description: null,
        is_required: true,
        order_index: 2,
        is_complete: false,
        details: { file_url: 'https://example.com/followup.pdf' },
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
            deleted_at: null,
            items: [
                { item_type: 'resource', ...firstResource },
                { item_type: 'resource', ...secondResource },
            ],
        },
    ];

    return { firstResource, secondResource, modules };
});

vi.mock('@/features/learning/api', () => ({
    fetchResource: vi.fn((id: number) => Promise.resolve(id === firstResource.id ? firstResource : secondResource)),
    fetchCourseProgress: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/courseStructure/api', () => ({
    fetchModules: vi.fn().mockResolvedValue(modules),
}));

function renderViewer(resourceId: number) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/learn/resources/${resourceId}?course=1`]}>
                <Routes>
                    <Route path="/learn/resources/:id" element={<ResourceViewerPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

it('shows a Next link but no Previous link on the first item', async () => {
    renderViewer(10);

    expect(await screen.findByRole('heading', { name: 'Intro document' })).toBeInTheDocument();
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    const nextLink = screen.getByText('Next').closest('a');
    expect(nextLink).toHaveAttribute('href', '/learn/resources/11?course=1');
});

it('shows a Previous link but no Next link on the last item', async () => {
    renderViewer(11);

    expect(await screen.findByRole('heading', { name: 'Follow-up document' })).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    const prevLink = screen.getByText('Previous').closest('a');
    expect(prevLink).toHaveAttribute('href', '/learn/resources/10?course=1');
});
