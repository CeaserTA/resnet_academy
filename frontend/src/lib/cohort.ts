import type { Cohort } from '@/lib/api/types';

/**
 * Cohort names are often entered as slugs ("september-2026"). Show those as words
 * ("September 2026"); names that already contain spaces are left exactly as typed.
 */
export function displayCohortName(name: string): string {
    if (/\s/.test(name)) return name;
    return name.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export type CohortPhase = 'open' | 'in_progress' | 'closed' | 'completed';

/**
 * Where a cohort stands for a prospective student (not the admin publish state). Dates win
 * over per-course flags: a cohort between its start and end dates is in progress even if no
 * course has been switched to `in_progress` yet.
 */
export function cohortPhase(cohort: Cohort): CohortPhase {
    if (daysUntil(cohort.end_date) < 0) return 'completed';
    if (daysUntil(cohort.start_date) <= 0 || cohort.courses.some((cc) => cc.status === 'in_progress')) return 'in_progress';
    if (cohort.courses.some((cc) => cc.is_accepting_applications)) return 'open';
    return 'closed';
}

/** Whole days from today until `dateStr` (negative once it has passed). */
export function daysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
