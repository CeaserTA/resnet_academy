import { CalendarDays, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseSection } from '@/features/sections/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SectionPickerProps {
    sections: CourseSection[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Inline section picker rendered inside the CourseDetailPage sidebar.
 * Returns null when sections is empty — parent controls visibility.
 *
 * Full sections (is_full: true) remain selectable — the backend handles them
 * as waitlist enrollments. We display a "Full — waitlist" badge but never block selection.
 */
export function SectionPicker({ sections, selectedId, onSelect }: SectionPickerProps) {
    if (sections.length === 0) return null;

    return (
        <div className="mt-5 border-t border-[#e8ecf1] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Choose a cohort
            </p>

            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Available cohorts">
                {sections.map((section) => {
                    const isSelected = section.id === selectedId;
                    const isFull = section.is_full;
                    const seatsLeft =
                        section.capacity !== null
                            ? section.capacity - section.seats_taken
                            : null;

                    return (
                        <button
                            key={section.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onSelect(section.id)}
                            className={cn(
                                'w-full rounded-xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                                isSelected
                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                    : 'border-[#e8ecf1] bg-white hover:border-blue-300 hover:bg-[#f8fafc]',
                            )}
                            data-selected={isSelected}
                            data-testid={`section-option-${section.id}`}
                        >
                            {/* Name + capacity badge */}
                            <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-ink-900 leading-snug">
                                    {section.name}
                                </span>
                                {isFull ? (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Full — waitlist
                                    </span>
                                ) : seatsLeft !== null ? (
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                        {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
                                    </span>
                                ) : null}
                            </div>

                            {/* Dates */}
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
                                <CalendarDays className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                                <span>
                                    {formatDate(section.start_date)} – {formatDate(section.end_date)}
                                </span>
                            </div>

                            {/* Application deadline */}
                            {section.application_deadline && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                                    <Clock className="size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                                    <span>Apply by {formatDate(section.application_deadline)}</span>
                                </div>
                            )}

                            {/* Instructor */}
                            {section.primary_instructor && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                                    <User className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                                    <span>{section.primary_instructor.name}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Prompt to select */}
            {selectedId === null && (
                <p className="mt-2 text-xs text-[#94a3b8]">
                    Select a cohort above to continue.
                </p>
            )}
        </div>
    );
}
