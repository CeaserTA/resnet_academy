/**
 * CohortSection — landing page cohort schedule.
 *
 * Displays real course sections (cohorts) from the database.
 * Shows both ongoing (in_progress) and upcoming (open) sections.
 */

import { Link } from 'react-router';
import { CalendarDays, Clock, Layers, Monitor, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublicSections } from '@/features/sections/useSections';
import { CourseSectionStatus, type PublicSection } from '@/features/sections/types';
import { Spinner } from '@/components/ui/Spinner';

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig = {
    in_progress: {
        label: 'Ongoing',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    open: {
        label: 'Registration Open',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
    },
} as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ─── Single cohort card ───────────────────────────────────────────────────────

function CohortCard({ section }: { section: PublicSection }) {
    const status = statusConfig[section.status as keyof typeof statusConfig];
    const instructor = section.primary_instructor || section.course.instructors[0];

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-blue-600" />

            <div className="flex flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                            {section.course.title}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-ink-900">{section.name}</h3>
                    </div>
                    {/* Status badge */}
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                            status.className,
                        )}
                    >
                        <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden="true" />
                        {status.label}
                    </span>
                </div>

                {/* Course description */}
                {section.course.description && (
                    <p className="text-sm leading-6 text-[#64748b] line-clamp-2">{section.course.description}</p>
                )}

                {/* Meta grid */}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                                {section.status === CourseSectionStatus.InProgress ? 'Started' : 'Starts'}
                            </dt>
                            <dd className="text-ink-700">{formatDate(section.start_date)}</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Ends</dt>
                            <dd className="text-ink-700">{formatDate(section.end_date)}</dd>
                        </div>
                    </div>
                    {instructor && (
                        <div className="flex items-start gap-2">
                            <Users className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Instructor</dt>
                                <dd className="text-ink-700">{instructor.name}</dd>
                            </div>
                        </div>
                    )}
                </dl>

                {/* Seat availability */}
                {section.capacity !== null && (
                    <div className="flex items-center gap-2 text-sm">
                        <Layers className="size-4 text-blue-500" aria-hidden="true" />
                        {section.is_full ? (
                            <span className="text-amber-700 font-medium">Section Full</span>
                        ) : section.seats_available !== null && section.seats_available <= 5 ? (
                            <span className="text-amber-700 font-medium">Only {section.seats_available} seats left!</span>
                        ) : (
                            <span className="text-ink-700">{section.seats_available} seats available</span>
                        )}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-auto pt-2">
                    <Link
                        to={`/courses/${section.course.id}`}
                        className={cn(
                            'inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                            section.status === CourseSectionStatus.Open
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border border-blue-600 text-blue-700 hover:bg-blue-50',
                        )}
                    >
                        {section.status === CourseSectionStatus.Open ? 'Register Now' : 'View Course'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function CohortSection() {
    const { data, isLoading } = usePublicSections();
    const sections = data ?? [];

    const now = new Date();
    const ongoing = sections.filter((s) => s.status === CourseSectionStatus.InProgress);
    const upcoming = sections.filter((s) => s.status === CourseSectionStatus.Open);

    if (isLoading) {
        return (
            <section
                id="cohorts"
                className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8"
            >
                <div className="mx-auto max-w-7xl flex justify-center py-12">
                    <Spinner />
                </div>
            </section>
        );
    }

    if (sections.length === 0) {
        return (
            <section
                id="cohorts"
                className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    {/* Heading */}
                    <div className="mx-auto mb-8 max-w-2xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                            Cohort Schedule
                        </p>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                            Upcoming & Ongoing Cohorts
                        </h2>
                        <p className="mt-4 text-base leading-7 text-[#64748b]">
                            Join a structured cohort for guided learning, peer accountability,
                            and direct mentor access.
                        </p>
                    </div>

                    {/* Empty state */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-16 text-center">
                        <CalendarDays className="size-10 text-[#cbd5e1]" aria-hidden="true" />
                        <p className="mt-4 text-base font-medium text-[#64748b]">No cohorts scheduled yet</p>
                        <p className="mt-1 text-sm text-[#94a3b8]">Check back soon — new cohorts are added regularly.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="cohorts"
            className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8"
        >
            <div className="mx-auto max-w-7xl">
                {/* Heading */}
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                        Cohort Schedule
                    </p>
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                        Upcoming & Ongoing Cohorts
                    </h2>
                    <p className="mt-4 text-base leading-7 text-[#64748b]">
                        Join a structured cohort for guided learning, peer accountability,
                        and direct mentor access.
                    </p>
                </div>

                {/* Cards */}
                <div className="space-y-8">
                    {/* Ongoing cohorts */}
                    {ongoing.length > 0 && (
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-900">
                                <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                Ongoing Cohorts
                            </h3>
                            <div className="grid gap-6 sm:grid-cols-2">
                                {ongoing.map((section) => (
                                    <CohortCard key={section.id} section={section} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming cohorts */}
                    {upcoming.length > 0 && (
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-900">
                                <span className="size-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                                Upcoming Cohorts
                            </h3>
                            <div className="grid gap-6 sm:grid-cols-2">
                                {upcoming.map((section) => (
                                    <CohortCard key={section.id} section={section} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* View all — proper button */}
                <div className="mt-8 flex justify-center">
                    <Link
                        to="/courses"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-[#3b82f6] transition-colors hover:bg-blue-50"
                    >
                        View all courses →
                    </Link>
                </div>
            </div>
        </section>
    );
}
