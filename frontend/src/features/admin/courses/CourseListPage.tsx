import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCourses } from '@/features/catalogue/useCourses';
import { useDeleteCourse } from '@/features/admin/courses/useAdminCourses';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { courseStatusDisplay } from '@/lib/statusBadge';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Course } from '@/lib/api/types';

function AdminCourseCard({
    course,
    isAdmin,
    isConfirmingDelete,
    onDelete,
}: {
    course: Course;
    isAdmin: boolean;
    isConfirmingDelete: boolean;
    onDelete: () => void;
}) {
    const status = courseStatusDisplay(course.status);

    return (
        <Card className="flex flex-col gap-3">
            <div className="flex aspect-video items-center justify-center rounded-md bg-blue-50 text-blue-600">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="size-full rounded-md object-cover" />
                ) : (
                    <BookOpen className="size-8" aria-hidden="true" />
                )}
            </div>

            <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg text-ink-900">{course.title}</h3>
                <Badge label={status.label} tone={status.tone} icon={status.icon} />
            </div>

            <p className="text-sm text-ink-600">{course.instructors.map((i) => i.name).join(', ') || 'No instructors assigned'}</p>

            <p className="font-mono text-base font-medium text-ink-900">
                {course.price} {course.currency}
            </p>

            <div className="mt-auto flex items-center gap-2 border-t border-surface-100 pt-3">
                <Link to={`/admin/courses/${course.id}/modules`}>
                    <Button variant="ghost" className="px-2 py-1" aria-label={`Manage modules for ${course.title}`}>
                        <Layers className="size-4" aria-hidden="true" />
                    </Button>
                </Link>
                <Link to={`/admin/courses/${course.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1" aria-label={`Edit ${course.title}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                </Link>
                {isAdmin && (
                    <Button
                        variant={isConfirmingDelete ? 'destructive' : 'ghost'}
                        className="px-2 py-1"
                        onClick={onDelete}
                        aria-label={isConfirmingDelete ? `Confirm delete ${course.title}` : `Delete ${course.title}`}
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        {isConfirmingDelete && 'Confirm'}
                    </Button>
                )}
            </div>
        </Card>
    );
}

export function CourseListPage() {
    const { user } = useAuth();
    const { data, isLoading } = useCourses({});
    const deleteCourse = useDeleteCourse();
    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    const handleDelete = async (id: number) => {
        if (confirmingId !== id) {
            setConfirmingId(id);
            return;
        }

        await deleteCourse.mutateAsync(id);
        setConfirmingId(null);
    };

    if (isLoading) {
        return <Spinner />;
    }

    const courses = data?.data ?? [];

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">{user?.role === 'admin' ? 'Courses' : 'My courses'}</h1>
                {user?.role === 'admin' && (
                    <Link to="/admin/courses/new">
                        <Button>
                            <Plus className="size-4" aria-hidden="true" />
                            New course
                        </Button>
                    </Link>
                )}
            </div>

            {courses.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="Create your first course to get started."
                    className="mt-6"
                />
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <AdminCourseCard
                            key={course.id}
                            course={course}
                            isAdmin={user?.role === 'admin'}
                            isConfirmingDelete={confirmingId === course.id}
                            onDelete={() => handleDelete(course.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
