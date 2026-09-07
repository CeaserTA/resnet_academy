/**
 * CohortSection — landing page cohort schedule.
 *
 * One card per cohort (an intake can offer several courses at once) — clicking through to
 * /cohorts/:id lets the student see every course in that cohort and pick the one to apply for.
 */

import { Link } from 'react-router';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCohorts } from '@/features/cohorts/useCohorts';
import { Spinner } from '@/components/ui/Spinner';
import type { Cohort } from '@/lib/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOngoing(cohort: Cohort): boolean {
    return cohort.courses.some((c) => c.status === 'in_progress');
}

function isUpcoming(cohort: Cohort): boolean {
    return !isOngoing(cohort) && cohort.courses.some((c) => c.status === 'open');
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ─── Single cohort card ───────────────────────────────────────────────────────

function CohortCard({ cohort }: { cohort: Cohort }) {
    const ongoing = isOngoing(cohort);
    const courseCount = cohort.courses.length;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-blue-600" />

            <div className="flex flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                            {courseCount} course{courseCount !== 1 ? 's' : ''}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-ink-900">{cohort.name}</h3>
                    </div>
                    {/* Status badge */}
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                            ongoing
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200',
                        )}
                    >
                        <span className={cn('size-1.5 rounded-full', ongoing ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden="true" />
                        {ongoing ? 'Ongoing' : 'Registration Open'}
                    </span>
                </div>

                {/* Courses in this cohort */}
                <ul className="flex flex-wrap gap-2">
                    {cohort.courses.map((cc) => (
                        <li
                            key={cc.id}
                            className="rounded-full border border-[#e8ecf1] bg-[#f8fafc] px-3 py-1 text-xs text-ink-700"
                        >
                            {cc.course?.title}
                        </li>
                    ))}
                </ul>

                {/* Meta grid */}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                                {ongoing ? 'Started' : 'Starts'}
                            </dt>
                            <dd className="text-ink-700">{formatDate(cohort.start_date)}</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Ends</dt>
                            <dd className="text-ink-700">{formatDate(cohort.end_date)}</dd>
                        </div>
                    </div>
                </dl>

                {/* CTA */}
                <div className="mt-auto pt-2">
                    <Link
                        to={`/cohorts/${cohort.id}`}
                        className={cn(
                            'inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                            ongoing
                                ? 'border border-blue-600 text-blue-700 hover:bg-blue-50'
                                : 'bg-blue-600 text-white hover:bg-blue-700',
                        )}
                    >
                        {ongoing ? 'View cohort' : 'View cohort & register'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function CohortSection() {
    const { data, isLoading } = useCohorts({ status: 'published' });
    const cohorts = data ?? [];

    const ongoing = cohorts.filter(isOngoing);
    const upcoming = cohorts.filter(isUpcoming);

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

    if (ongoing.length === 0 && upcoming.length === 0) {
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
                                {ongoing.map((cohort) => (
                                    <CohortCard key={cohort.id} cohort={cohort} />
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
                                {upcoming.map((cohort) => (
                                    <CohortCard key={cohort.id} cohort={cohort} />
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
