/**
 * CohortSection — landing page cohort schedule.
 * Card grid on a navy background — visually distinct from the white courses carousel above.
 * Shows the first few cohorts and expands in place, so the section stays a fixed size no
 * matter how many cohorts the backend publishes.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarDays, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cohortPhase, daysUntil, displayCohortName } from '@/lib/cohort';
import { useCohorts } from '@/features/cohorts/useCohorts';
import { Spinner } from '@/components/ui/Spinner';
import type { Cohort } from '@/lib/api/types';

const INITIAL_VISIBLE = 3;
const MAX_COURSE_TAGS = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, withYear = true): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
    });
}

// ─── Single cohort card ───────────────────────────────────────────────────────

function CohortCard({ cohort }: { cohort: Cohort }) {
    const ongoing = cohortPhase(cohort) === 'in_progress';
    const deadlineDays = cohort.application_deadline ? daysUntil(cohort.application_deadline) : null;
    const courses = cohort.courses.filter((cc) => cc.course);
    const extraCourses = courses.length - MAX_COURSE_TAGS;

    return (
        <article className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/25 hover:bg-white/[0.07]">
            <span
                className={cn(
                    'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    ongoing ? 'bg-success-600/20 text-navy-foreground' : 'bg-amber-500/20 text-amber-100',
                )}
            >
                <span className={cn('size-1.5 rounded-full', ongoing ? 'bg-success-600' : 'bg-amber-500')} aria-hidden="true" />
                {ongoing ? 'Ongoing' : 'Registration open'}
            </span>

            <h3 className="mt-3 text-xl text-navy-foreground">{displayCohortName(cohort.name)}</h3>

            <dl className="mt-3 space-y-1.5 text-sm text-navy-foreground/70">
                <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Dates</dt>
                    <dd>{formatDate(cohort.start_date, false)} – {formatDate(cohort.end_date)}</dd>
                </div>
                {!ongoing && cohort.application_deadline && deadlineDays !== null && deadlineDays >= 0 && (
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Application deadline</dt>
                        <dd>
                            Apply by {formatDate(cohort.application_deadline, false)}
                            <span className="text-amber-500"> · {deadlineDays === 0 ? 'closes today' : `${deadlineDays} day${deadlineDays === 1 ? '' : 's'} left`}</span>
                        </dd>
                    </div>
                )}
            </dl>

            {courses.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Courses in this cohort">
                    {courses.slice(0, MAX_COURSE_TAGS).map((cc) => (
                        <li key={cc.id} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-navy-foreground/80">
                            {cc.course?.title}
                        </li>
                    ))}
                    {extraCourses > 0 && (
                        <li className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-navy-foreground/60">
                            +{extraCourses} more
                        </li>
                    )}
                </ul>
            )}

            {/* Pinned to the card bottom so buttons line up across a row */}
            <div className="mt-auto pt-5">
                <Link
                    to={`/cohorts/${cohort.id}`}
                    className={cn(
                        'flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                        ongoing
                            ? 'border border-white/30 text-navy-foreground hover:border-white hover:bg-white/10'
                            : 'bg-primary text-white hover:bg-blue-400',
                    )}
                >
                    {ongoing ? 'View cohort' : 'Register now'}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SectionHeading() {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
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
    );
}

export function CohortSection() {
    const { data, isLoading } = useCohorts({ status: 'published' });
    const [showAll, setShowAll] = useState(false);
    const cohorts = data ?? [];

    // Open registrations first (soonest start first), then cohorts already running.
    const byStart = (a: Cohort, b: Cohort) => a.start_date.localeCompare(b.start_date);
    const inPhase = (phase: string) => cohorts.filter((c) => cohortPhase(c) === phase).sort(byStart);
    const allVisible = [...inPhase('open'), ...inPhase('in_progress')];
    const shown = showAll ? allVisible : allVisible.slice(0, INITIAL_VISIBLE);
    const hiddenCount = allVisible.length - INITIAL_VISIBLE;

    if (isLoading) {
        return (
            <section id="cohorts" className="bg-navy px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl justify-center py-8">
                    <Spinner />
                </div>
            </section>
        );
    }

    return (
        <section id="cohorts" className="bg-navy px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <SectionHeading />

                {allVisible.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-12 text-center">
                        <CalendarDays className="size-8 text-navy-foreground/30" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-navy-foreground/60">No cohorts scheduled yet</p>
                        <p className="mt-1 text-xs text-navy-foreground/40">Check back soon — new cohorts are added regularly.</p>
                    </div>
                ) : (
                    <>
                        <div id="cohort-grid" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {shown.map((cohort) => (
                                <CohortCard key={cohort.id} cohort={cohort} />
                            ))}
                        </div>

                        {hiddenCount > 0 && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setShowAll((v) => !v)}
                                    aria-expanded={showAll}
                                    aria-controls="cohort-grid"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-navy-foreground transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                    {showAll ? 'Show fewer' : `Show all ${allVisible.length} cohorts`}
                                    <ChevronDown className={cn('size-4 transition-transform', showAll && 'rotate-180')} aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
