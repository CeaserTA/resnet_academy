import { Link } from 'react-router';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
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
    /** Optional override image src — falls back to `course.thumbnail_url` then placeholder. */
    imageSrc?: string;
    /** Optional duration + format line, e.g. "6 weeks • Part-time" */
    duration?: string;
    format?: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export function CourseCard({ course, imageSrc, duration, format }: CourseCardProps) {
    // Database thumbnail takes priority over static fallback map
    const image = course.thumbnail_url ?? imageSrc ?? null;
    const price = formatPrice(course.price, course.currency);
    const durationLine = duration && format ? `${duration} • ${format}` : duration ?? null;

    return (
        <Card className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white p-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            {/* ── Image header — 16:9 with absolute level badge ── */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#eff6ff]">
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

                {/* Level badge — overlays top-left of the image */}
                <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#334155] shadow-sm backdrop-blur-sm">
                    {levelLabel[course.level] ?? course.level}
                </span>
            </div>

            {/* ── Card body ── */}
            <CardHeader className="space-y-1.5 px-5 pb-0 pt-4">
                {course.category && (
                    <span className="inline-flex w-fit items-center rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        {course.category.name}
                    </span>
                )}
                <CardTitle className="text-sm font-semibold leading-snug">{course.title}</CardTitle>
                {course.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                        {course.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="mt-auto space-y-3 px-5 pb-5 pt-3">
                {/* Duration pill */}
                {durationLine && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <Clock className="size-3 shrink-0" aria-hidden="true" />
                        <span>{durationLine}</span>
                    </div>
                )}

                {/* Price */}
                {price && (
                    <div className="text-xs font-semibold text-[#0f172a]">{price}</div>
                )}

                {/* Divider */}
                <hr className="border-[#e8ecf1]" />

                {/* Footer row: duration label + View Details link */}
                <div className="flex items-center justify-between">
                    {durationLine ? (
                        <span className="text-xs text-[#64748b]">{durationLine}</span>
                    ) : (
                        <span />
                    )}

                    {/* Text link + arrow — bottom-right, no button chrome */}
                    <Link
                        to={`/courses/${course.id}`}
                        className="group/link inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-transform hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        View Details
                        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5" aria-hidden="true" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
