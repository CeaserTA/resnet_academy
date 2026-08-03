/**
 * CohortSection — landing page cohort schedule.
 *
 * DATA IS STATIC for now. Edit the `cohorts` array below when confirmed
 * details arrive. Each cohort maps to one or more courses via `courses[]`.
 *
 * Status options: 'ongoing' | 'upcoming' | 'registration-open'
 */

import { Link } from 'react-router';
import { CalendarDays, Clock, Layers, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CohortData {
    id: string;
    number: number;
    name: string;
    tagline: string;
    startDate: string;         // display string — update once confirmed
    duration: string;
    mode: string;
    status: 'ongoing' | 'upcoming' | 'registration-open';
    courses: string[];         // course names included in this cohort
    ctaLabel: string;
    ctaHref: string;
}

const cohorts: CohortData[] = [
    {
        id: 'cohort-4',
        number: 4,
        name: 'Frontend Specialization',
        tagline: 'Master the full front-end stack — from semantic HTML to production-ready React apps.',
        startDate: 'December 2025',
        duration: '6 weeks',
        mode: 'Both (Online & In-person)',
        status: 'registration-open',
        courses: [
            'Web Foundations',
            'Dynamic Web',
            'Progressive Web App Development',
        ],
        ctaLabel: 'Register Now',
        ctaHref: '/courses',
    },
    {
        id: 'cohort-5',
        number: 5,
        name: 'Backend Specialization',
        tagline: 'Build robust server-side systems, design databases, and ship APIs that scale.',
        startDate: 'January 2026',
        duration: '8 weeks',
        mode: 'Both (Online & In-person)',
        status: 'upcoming',
        courses: [
            'Full-Stack',
            'Database Querying & Schema Design',
            'Vue.js & Laravel',
        ],
        ctaLabel: 'Join Waitlist',
        ctaHref: '/courses',
    },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig = {
    ongoing: {
        label: 'Ongoing',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    upcoming: {
        label: 'Coming Soon',
        className: 'bg-[#f1f5f9] text-[#64748b] border-[#e8ecf1]',
        dot: 'bg-[#94a3b8]',
    },
    'registration-open': {
        label: 'Registration Open',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
    },
} as const;

// ─── Single cohort card ───────────────────────────────────────────────────────

function CohortCard({ cohort }: { cohort: CohortData }) {
    const status = statusConfig[cohort.status];

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-blue-600" />

            <div className="flex flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                            Cohort {cohort.number}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-ink-900">{cohort.name}</h3>
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

                {/* Tagline */}
                <p className="text-sm leading-6 text-[#64748b]">{cohort.tagline}</p>

                {/* Meta grid */}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Starts</dt>
                            <dd className="text-ink-700">{cohort.startDate}</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Duration</dt>
                            <dd className="text-ink-700">{cohort.duration}</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Monitor className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Mode</dt>
                            <dd className="text-ink-700">{cohort.mode}</dd>
                        </div>
                    </div>
                </dl>

                {/* Included courses */}
                <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        <Layers className="size-3.5" aria-hidden="true" />
                        Courses included
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {cohort.courses.map((course) => (
                            <li
                                key={course}
                                className="rounded-full border border-[#e8ecf1] bg-[#f8fafc] px-3 py-1 text-xs text-ink-700"
                            >
                                {course}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA */}
                <div className="mt-auto pt-2">
                    <Link
                        to={cohort.ctaHref}
                        className={cn(
                            'inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                            cohort.status === 'registration-open'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border border-blue-600 text-blue-700 hover:bg-blue-50',
                        )}
                    >
                        {cohort.ctaLabel}
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function CohortSection() {
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
                <div className="grid gap-6 sm:grid-cols-2">
                    {cohorts.map((cohort) => (
                        <CohortCard key={cohort.id} cohort={cohort} />
                    ))}
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
