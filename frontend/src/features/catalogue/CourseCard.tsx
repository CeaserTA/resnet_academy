import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import type { Course } from '@/lib/api/types';

const levelLabel: Record<Course['level'], string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

function formatPrice(price: string, currency: string): string {
    const amount = Number(price);
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function CourseCard({ course }: { course: Course }) {
    return (
        <Link to={`/courses/${course.id}`}>
            <Card className="flex h-full flex-col gap-3">
                <div className="flex aspect-video items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt="" className="size-full rounded-md object-cover" />
                    ) : (
                        <BookOpen className="size-8" aria-hidden="true" />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Badge label={levelLabel[course.level]} tone="progress" />
                    {course.category && <span className="text-xs text-ink-600">{course.category.name}</span>}
                </div>

                <h3 className="text-lg">{course.title}</h3>

                {course.instructors.length > 0 && (
                    <p className="text-sm text-ink-600">{course.instructors.map((i) => i.name).join(', ')}</p>
                )}

                <p className="mt-auto font-mono text-base font-medium text-ink-900">
                    {formatPrice(course.price, course.currency)}
                </p>
            </Card>
        </Link>
    );
}
