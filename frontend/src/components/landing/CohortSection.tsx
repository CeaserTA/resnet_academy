/**
 * CohortSection — landing page cohort schedule.
 * Compact list-row layout on a navy background — visually distinct from the
 * white courses carousel section directly above it.
 */

import { Link } from 'react-router';
import { ArrowRight, CalendarDays, Clock } from 'lucide-react';
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
        month: 'short',
        year: 'numeric',
    });
}

// ─── Single cohort row ────────────────────────────────────────────────────────

function CohortRow({ cohort }: { cohort: Cohort }) {
    const ongoing = isOngoing(cohort);

    return (
        <div className="flex flex-col gap-4 border-t border-white/10 py-5 sm:flex-row sm:items-center sm:justify-between">

            {/* Left: status + name + courses */}
            <div className="flex items-start gap-4 sm:flex-1">
                {/* Status dot */}
                <span
                    className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        ongoing ? 'bg-emerald-400' : 'bg-amber-400',
                    )}
                    aria-hidden="true"
                />
                <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{cohort.name}</p>
                    {/* Course tags */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cohort.courses.map((cc) => (
                            <span
                                key={cc.id}
                                className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70"
                            >
                                {cc.course?.title}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle: dates + seats */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 pl-6 sm:pl-0 text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                    {formatDate(cohort.start_date)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                    {formatDate(cohort.end_date)}
                </span>
            </div>

            {/* Right: CTA */}
            <Link
                to={`/cohorts/${cohort.id}`}
                className={cn(
                    'ml-6 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:ml-0',
                    ongoing
                        ? 'border border-white/30 text-white hover:border-white hover:bg-white/10'
                        : 'bg-primary text-white hover:bg-blue-500',
                )}
            >
                {ongoing ? 'View cohort' : 'Register now'}
                <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
        </div>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function CohortSection() {
    const { data, isLoading } = useCohorts({ status: 'published' });
    const cohorts = data ?? [];

    const ongoing = cohorts.filter(isOngoing);
    const upcoming = cohorts.filter(isUpcoming);
    const allVisible = [...ongoing, ...upcoming];

    if (isLoading) {
        return (
            <section
                id="cohorts"
                className="border-t border-white/10 bg-navy px-4 py-12 sm:px-6 lg:px-8"
            >
                <div className="mx-auto max-w-7xl flex justify-center py-8">
                    <Spinner />
                </div>
            </section>
        );
    }

    if (allVisible.length === 0) {
        return (
            <section
                id="cohorts"
                className="bg-navy px-4 py-12 sm:px-6 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                                Cohort Schedule
                            </p>
                            <h2 className="mt-2 text-3xl text-navy-foreground sm:text-4xl">
                                Choose your intake.
                            </h2>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-12 text-center">
                        <CalendarDays className="size-8 text-white/30" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-white/50">No cohorts scheduled yet</p>
                        <p className="mt-1 text-xs text-white/30">Check back soon — new cohorts are added regularly.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="cohorts"
            className="bg-navy px-4 py-12 sm:px-6 lg:px-8"
        >
            <div className="mx-auto max-w-7xl">

                {/* Heading */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                            Cohort Schedule
                        </p>
                        <h2 className="mt-2 text-3xl text-navy-foreground sm:text-4xl">
                            Choose your intake.
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-navy-foreground/60">
                            Cohorts are capped so every learner gets mentor time. Registration closes
                            once seats run out.
                        </p>
                    </div>
                    <Link
                        to="/cohorts"
                        className="shrink-0 self-start rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-navy-foreground transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto"
                    >
                        Full schedule
                    </Link>
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center gap-6 text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                        Ongoing
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-400" aria-hidden="true" />
                        Registration open
                    </span>
                </div>

                {/* Cohort rows */}
                <div className="mt-2">
                    {allVisible.map((cohort) => (
                        <CohortRow key={cohort.id} cohort={cohort} />
                    ))}
                    {/* Bottom border */}
                    <div className="border-t border-white/10" />
                </div>

            </div>
        </section>
    );
}
