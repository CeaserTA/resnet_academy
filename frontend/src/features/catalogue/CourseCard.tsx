import { Link } from 'react-router';
import { ArrowRight, Clock, Layers } from 'lucide-react';
import type { Course } from '@/lib/api/types';

const levelLabel: Record<Course['level'], string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

function formatPrice(price: string, currency: string): string {
    const amount = Number(price);
    if (isNaN(amount)) return '';
    if (currency === 'UGX') {
        return `UGX ${new Intl.NumberFormat('en-UG').format(amount)}`;
    }
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

interface CourseCardProps {
    course: Course;
    imageSrc?: string;
    duration?: string;
    format?: string;
}

export function CourseCard({ course, imageSrc, duration, format }: CourseCardProps) {
    const image = course.thumbnail_url ?? imageSrc ?? null;
    const price = formatPrice(course.price, course.currency);
    // First letter of course title for the placeholder
    const initial = course.title.charAt(0).toUpperCase();

    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">

            {/* ── Thumbnail ── */}
            <div className="relative bg-blue-50">
                {/* Level badge — top left */}
                <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-900 shadow-sm">
                    {levelLabel[course.level] ?? course.level}
                </span>

                {image ? (
                    <img
                        src={image}
                        alt={course.title}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    /* Letter placeholder matching screenshot style */
                    <div className="flex h-44 w-full items-center justify-center bg-blue-50">
                        <span
                            className="font-display text-7xl font-bold text-blue-200 select-none"
                            aria-hidden="true"
                        >
                            {initial}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 flex-col gap-3 p-5">

                {/* Category pill */}
                {course.category && (
                    <span className="inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">
                        {course.category.name}
                    </span>
                )}

                {/* Title */}
                <h3 className="text-base font-semibold leading-snug text-ink-900">
                    {course.title}
                </h3>

                {/* Description */}
                {course.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-ink-600">
                        {course.description}
                    </p>
                )}

                {/* Duration + hrs/week meta — light blue pill style */}
                {(duration || format) && (
                    <div className="flex items-center gap-2 text-xs">
                        {duration && (
                            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-ink-600">
                                <Clock className="size-3.5 text-primary" aria-hidden="true" />
                                {duration}
                            </span>
                        )}
                        {format && (
                            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-ink-600">
                                <Layers className="size-3.5 text-primary" aria-hidden="true" />
                                {format}
                            </span>
                        )}
                    </div>
                )}

                {/* Divider */}
                <hr className="border-border" />

                {/* Price + CTA */}
                <div className="mt-auto flex items-center justify-between gap-3">
                    <div>
                        {price && (
                            <>
                                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-300">
                                    Full course fee
                                </p>
                                <p className="text-base font-bold text-ink-900">{price}</p>
                            </>
                        )}
                    </div>
                    <Link
                        to={`/courses/${course.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        View course
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
