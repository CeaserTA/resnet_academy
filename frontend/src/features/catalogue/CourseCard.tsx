import { Link } from 'react-router';
import { BookOpen, SignalHigh } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/Card';
import type { Course } from '@/lib/api/types';

// ─── helpers ────────────────────────────────────────────────────────────────

const levelLabel: Record<Course['level'], string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

function formatPrice(price: string, currency: string): string {
    const amount = Number(price);
    if (isNaN(amount)) return '';
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

// ─── props ───────────────────────────────────────────────────────────────────

interface CourseCardProps {
    course: Course;
    /**
     * Optional override image src. When omitted the card falls back to
     * `course.thumbnail_url` and then to a placeholder icon.
     */
    imageSrc?: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export function CourseCard({ course, imageSrc }: CourseCardProps) {
    const image = imageSrc ?? course.thumbnail_url ?? null;
    const price = formatPrice(course.price, course.currency);

    return (
        <Card className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white p-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            {/* ── Image header — shorter than 3:2 to keep the card compact ── */}
            <div className="aspect-[16/9] w-full overflow-hidden bg-[#eff6ff]">
                {image ? (
                    <img
                        src={image}
                        alt={course.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-300">
                        <BookOpen className="size-8" aria-hidden="true" />
                    </div>
                )}
            </div>

            {/* ── Card body ── */}
            <CardHeader className="space-y-1.5 px-4 pb-0 pt-3.5">
                {/* Category badge — solid primary blue */}
                {course.category && (
                    <span className="inline-flex w-fit items-center rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        {course.category.name}
                    </span>
                )}

                <div className="space-y-1">
                    <CardTitle className="text-sm leading-snug">{course.title}</CardTitle>
                    {course.description && (
                        <CardDescription className="line-clamp-2 text-xs">
                            {course.description}
                        </CardDescription>
                    )}
                </div>
            </CardHeader>

            <CardContent className="mt-auto space-y-3 px-4 pb-4 pt-2.5">
                {/* Level + price row */}
                <div className="flex items-center justify-between text-xs text-[#64748b]">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#eff6ff] text-blue-600">
                            <SignalHigh className="size-3" aria-hidden="true" />
                        </span>
                        <span>{levelLabel[course.level] ?? course.level}</span>
                    </div>

                    {price && (
                        <span className="font-semibold text-ink-900">{price}</span>
                    )}
                </div>

                {/* CTA */}
                <Link
                    to={`/courses/${course.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    View Course
                </Link>
            </CardContent>
        </Card>
    );
}
