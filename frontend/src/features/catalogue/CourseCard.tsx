import { Link } from 'react-router';
import { ArrowRight, Clock, Layers, MapPin, CalendarDays } from 'lucide-react';
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

export interface CourseCardProps {
    course: Course;
    imageSrc?: string;
    duration?: string;
    format?: string;
    delivery?: string;
    skills?: string[];
    nextCohort?: string;
    outcome?: string;
    /** Index in the grid — used for staggered entrance animation */
    index?: number;
}

export function CourseCard({
    course,
    imageSrc,
    duration,
    format,
    delivery,
    skills,
    nextCohort,
    outcome,
    index = 0,
}: CourseCardProps) {
    const image = course.thumbnail_url ?? imageSrc ?? null;
    const price = formatPrice(course.price, course.currency);
    const initial = course.title.charAt(0).toUpperCase();

    return (
        <Link
            to={`/courses/${course.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`View ${course.title}`}
            style={{
                animation: 'card-enter 0.4s ease both',
                animationDelay: `${index * 80}ms`,
            }}
        >
            {/* ── Thumbnail ── */}
            <div className="relative bg-blue-50">
                <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-900 shadow-sm">
                    {levelLabel[course.level] ?? course.level}
                </span>

                {image ? (
                    <img
                        src={image}
                        alt={course.title}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            (e.currentTarget.nextElementSibling as HTMLElement | null)
                                ?.style.setProperty('display', 'flex');
                        }}
                    />
                ) : null}

                <div
                    className="h-44 w-full items-center justify-center bg-blue-50"
                    style={{ display: image ? 'none' : 'flex' }}
                    aria-hidden="true"
                >
                    <span className="font-display select-none text-7xl font-bold text-blue-200">
                        {initial}
                    </span>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 flex-col gap-3 p-5">

                {/* Category pill */}
                {course.category && (
                    <span className="inline-flex w-fit items-center rounded-full bg-navy px-3 py-1 text-[11px] font-semibold text-white">
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

                {/* Outcome — bold project statement */}
                {outcome && (
                    <p className="text-sm font-semibold leading-snug text-ink-900">
                        {outcome}
                    </p>
                )}

                {/* Skills tags */}
                {skills && skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                            <span
                                key={skill}
                                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-ink-600"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                )}

                {/* Meta row: duration · hrs/week · delivery */}
                {(duration || format || delivery) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
                        {duration && (
                            <span className="flex items-center gap-1">
                                <Clock className="size-3.5 text-primary" aria-hidden="true" />
                                {duration}
                            </span>
                        )}
                        {format && (
                            <span className="flex items-center gap-1">
                                <Layers className="size-3.5 text-primary" aria-hidden="true" />
                                {format}
                            </span>
                        )}
                        {delivery && (
                            <span className="flex items-center gap-1">
                                <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                                {delivery}
                            </span>
                        )}
                    </div>
                )}

                {/* Next cohort */}
                {nextCohort && (
                    <p className="flex items-center gap-1.5 text-xs text-ink-600">
                        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span>
                            Next cohort: <span className="font-semibold text-ink-900">{nextCohort}</span>
                        </span>
                    </p>
                )}

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
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                        View course
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                </div>

            </div>
        </Link>
    );
}
