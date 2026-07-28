import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, Layers, MoreVertical, Pencil, Search, Trash2 } from 'lucide-react';
import { useCourses } from '@/features/catalogue/useCourses';
import { useDeleteCourse } from '@/features/admin/courses/useAdminCourses';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { courseStatusDisplay } from '@/lib/statusBadge';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Course } from '@/lib/api/types';

function formatPrice(price: string): string {
    return Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AdminCourseCard({ course, isAdmin, onDelete }: { course: Course; isAdmin: boolean; onDelete: () => void }) {
    const navigate = useNavigate();
    const status = courseStatusDisplay(course.status);
    const primaryInstructor = course.instructors[0];

    const handleDelete = () => {
        if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
            onDelete();
        }
    };

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-surface-100 bg-surface-0 transition-shadow hover:shadow-md">
            <div className="relative aspect-video bg-blue-50 text-blue-600">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <BookOpen className="size-8" aria-hidden="true" />
                    </div>
                )}
                <Badge
                    label={status.label.toUpperCase()}
                    tone={status.tone}
                    className="absolute left-2.5 top-2.5 bg-surface-0 shadow-sm"
                />

                <DropdownMenu
                    align="right"
                    className="absolute right-2.5 top-2.5"
                    trigger={(toggle) => (
                        <button
                            onClick={toggle}
                            aria-label={`Actions for ${course.title}`}
                            className="flex items-center justify-center rounded-full bg-surface-0 p-1.5 text-ink-900 shadow-sm hover:bg-surface-50"
                        >
                            <MoreVertical className="size-4" aria-hidden="true" />
                        </button>
                    )}
                    items={[
                        { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/courses/${course.id}/edit`) },
                        { label: 'Manage', icon: Layers, onClick: () => navigate(`/admin/courses/${course.id}/modules`) },
                        ...(isAdmin
                            ? [{ label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: handleDelete }]
                            : []),
                    ]}
                />
            </div>

            <div className="flex flex-1 flex-col gap-2.5 p-4">
                <h3 className="truncate text-base font-semibold text-ink-900">{course.title}</h3>

                <div className="flex items-center gap-2">
                    {primaryInstructor ? (
                        <>
                            <Avatar name={primaryInstructor.name} src={primaryInstructor.avatar_url} size="sm" />
                            <span className="truncate text-sm text-ink-600">{primaryInstructor.name}</span>
                        </>
                    ) : (
                        <span className="truncate text-sm text-ink-600">No instructors assigned</span>
                    )}
                </div>

                <div className="mt-auto pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Price</p>
                    <p className="font-mono text-base font-bold text-ink-900">
                        {formatPrice(course.price)} <span className="text-xs font-normal text-ink-600">{course.currency}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export function CourseListPage() {
    const { user } = useAuth();
    const { data, isLoading } = useCourses({});
    const deleteCourse = useDeleteCourse();
    const [search, setSearch] = useState('');

    const isAdmin = user?.role === 'admin';

    const courses = useMemo(() => data?.data ?? [], [data]);

    const filteredCourses = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return courses;
        }
        return courses.filter((course) => course.title.toLowerCase().includes(term));
    }, [courses, search]);

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-ink-900">{isAdmin ? 'Courses' : 'My courses'}</h1>
                    <p className="mt-1 text-sm text-ink-600">
                        {isAdmin ? 'Manage and monitor your curriculum performance' : 'Manage and monitor the courses you teach'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                        <Input
                            label="Search courses"
                            labelClassName="sr-only"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search courses…"
                            className="w-56 py-2 pl-9 pr-3"
                        />
                    </div>
                    {isAdmin && (
                        <Link to="/admin/courses/new">
                            <Button>
                                <span aria-hidden="true">+</span>
                                New course
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && filteredCourses.length === 0 && (
                <EmptyState
                    icon={BookOpen}
                    title={courses.length === 0 ? 'No courses yet' : 'No courses match this search'}
                    description={courses.length === 0 ? 'Create your first course to get started.' : 'Try a different search term.'}
                    className="mt-6"
                />
            )}

            {!isLoading && filteredCourses.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredCourses.map((course) => (
                        <AdminCourseCard
                            key={course.id}
                            course={course}
                            isAdmin={isAdmin}
                            onDelete={() => deleteCourse.mutate(course.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
