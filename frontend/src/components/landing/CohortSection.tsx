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
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex flex-1 flex-col gap-4 p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-300">
                            {courseCount} course{courseCount !== 1 ? 's' : ''}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-ink-900">{cohort.name}</h3>
                    </div>
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium',
                            ongoing
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700',
                        )}
                    >
                        {ongoing ? 'Ongoing' : 'Registration open'}
                    </span>
                </div>

                {/* Course tags */}
                <ul className="flex flex-wrap gap-1.5">
                    {cohort.courses.map((cc) => (
                        <li
                            key={cc.id}
                            className="rounded-full border border-border bg-surface-50 px-3 py-0.5 text-xs text-ink-600"
                        >
                            {cc.course?.title}
                        </li>
                    ))}
                </ul>

                {/* Meta */}
                <dl className="grid grid-cols-2 gap-2 text-xs text-ink-600">
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <dd>{formatDate(cohort.start_date)}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <dd>{formatDate(cohort.end_date)}</dd>
                    </div>
                </dl>

                {/* CTA */}
                <Link
                    to={`/cohorts/${cohort.id}`}
                    className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                    View cohort &amp; register
                </Link>
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
                className="border-t border-border bg-white px-4 py-10 sm:px-6 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    {/* Heading */}
                    <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                Cohort Schedule
                            </p>
                            <h2 className="mt-2 text-3xl text-ink-900 sm:text-4xl">
                                Choose your intake.
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
                                Cohorts are capped so every learner gets mentor time. Registration closes
                                once seats run out.
                            </p>
                        </div>
                    </div>

                    {/* Empty state */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-50 py-14 text-center">
                        <CalendarDays className="size-9 text-ink-300" aria-hidden="true" />
                        <p className="mt-4 text-sm font-medium text-ink-600">No cohorts scheduled yet</p>
                        <p className="mt-1 text-xs text-ink-300">Check back soon — new cohorts are added regularly.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            id="cohorts"
            className="border-t border-border bg-white px-4 py-10 sm:px-6 lg:px-8"
        >
            <div className="mx-auto max-w-7xl">
                {/* Heading */}
                <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Cohort Schedule
                        </p>
                        <h2 className="mt-2 text-3xl text-ink-900 sm:text-4xl">
                            Choose your intake.
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
                            Cohorts are capped so every learner gets mentor time. Registration closes
                            once seats run out.
                        </p>
                    </div>
                    <Link
                        to="/cohorts"
                        className="shrink-0 self-start rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary sm:self-auto"
                    >
                        Full schedule
                    </Link>
                </div>

                {/* Cards */}
                <div className="space-y-6">
                    {/* Ongoing cohorts */}
                    {ongoing.length > 0 && (
                        <div>
                            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
                                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                Ongoing
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2">
                                {ongoing.map((cohort) => (
                                    <CohortCard key={cohort.id} cohort={cohort} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming cohorts */}
                    {upcoming.length > 0 && (
                        <div>
                            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
                                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                                Registration Open
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2">
                                {upcoming.map((cohort) => (
                                    <CohortCard key={cohort.id} cohort={cohort} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
