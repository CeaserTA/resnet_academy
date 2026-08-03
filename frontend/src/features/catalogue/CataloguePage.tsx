import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { BookX } from 'lucide-react';
import { useCategories, useCourses } from '@/features/catalogue/useCourses';
import { CourseCard } from '@/features/catalogue/CourseCard';
import { HeroSection } from '@/features/catalogue/HeroSection';
import { FaqSection } from '@/features/catalogue/FaqSection';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CourseFilters } from '@/features/catalogue/api';

export function CataloguePage() {
    const [searchParams] = useSearchParams();
    // Seeds the level filter from a `?level=` query param (e.g. the Advisory/Application modals'
    // "Browse beginner courses" link) — read once on mount, not kept in sync afterward.
    const [filters, setFilters] = useState<CourseFilters>(() => {
        const level = searchParams.get('level');
        return level ? { level } : {};
    });
    const { data: categories } = useCategories();
    const { data, isLoading } = useCourses(filters);

    const updateFilter = (key: keyof CourseFilters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value || undefined, page: undefined }));
    };

    return (
        <div>
            <HeroSection />

            <div id="course-grid" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
                <h1 className="text-3xl">Browse courses</h1>
                <p className="mt-1 text-ink-600">Browse published courses and find the right one for you.</p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Select label="Category" onChange={(e) => updateFilter('category_id', e.target.value)} defaultValue="">
                        <option value="">All categories</option>
                        {categories?.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </Select>

                    <Select label="Level" onChange={(e) => updateFilter('level', e.target.value)} defaultValue={filters.level ?? ''}>
                        <option value="">All levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </Select>

                    <Select
                        label="Instructor"
                        onChange={(e) => updateFilter('instructor_id', e.target.value)}
                        defaultValue=""
                    >
                        <option value="">All instructors</option>
                        {Array.from(new Map(data?.data.flatMap((c) => c.instructors).map((i) => [i.id, i])).values()).map(
                            (instructor) => (
                                <option key={instructor.id} value={instructor.id}>
                                    {instructor.name}
                                </option>
                            ),
                        )}
                    </Select>
                </div>

                <div className="mt-8">
                    {isLoading && <Spinner />}

                    {!isLoading && data && data.data.length === 0 && (
                        <EmptyState
                            icon={BookX}
                            title="No courses match those filters"
                            description="Try widening your search or clearing a filter."
                        />
                    )}

                    {!isLoading && data && data.data.length > 0 && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {data.data.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <FaqSection />
        </div>
    );
}
