import { CalendarDays, User, Clock } from 'lucide-react';
import type { CohortCourse } from '@/lib/api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Read-only display of the cohort this course belongs to, rendered in the
 * CourseDetailPage sidebar. Every enrolment targets a specific cohort offering
 * behind the scenes, but the student never chooses one here — cohort selection
 * only happens when a course is offered by more than one open cohort at once,
 * which is browsed via /cohorts instead.
 */
export function CohortInfo({ section }: { section: CohortCourse }) {
    const seatsLeft = section.capacity !== null ? section.capacity - section.seats_taken : null;

    return (
        <div className="mt-5 border-t border-[#e8ecf1] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Cohort
            </p>

            <div className="rounded-xl border border-[#e8ecf1] bg-[#f8fafc] px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-ink-900 leading-snug">
                        {section.cohort_name}
                    </span>
                    {section.is_full ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Full — waitlist
                        </span>
                    ) : seatsLeft !== null ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
                        </span>
                    ) : null}
                </div>

                {section.start_date && section.end_date && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
                        <CalendarDays className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span>
                            {formatDate(section.start_date)} – {formatDate(section.end_date)}
                        </span>
                    </div>
                )}

                {section.application_deadline && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                        <Clock className="size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>Apply by {formatDate(section.application_deadline)}</span>
                    </div>
                )}

                {section.primary_instructor && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                        <User className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span>{section.primary_instructor.name}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
