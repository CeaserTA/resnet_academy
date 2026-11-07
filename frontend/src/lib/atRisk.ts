import type { AtRiskStudent, Course, CourseAnalytics } from '@/lib/api/types';

export type AtRiskEntry = AtRiskStudent & { course: Pick<Course, 'id' | 'title'> };

/**
 * Every at-risk student across a set of courses, least recently active first (never active on
 * top), from each course's analytics. Shared by the admin and instructor dashboards.
 */
export function collectAtRisk(courses: Pick<Course, 'id' | 'title'>[], analytics: (CourseAnalytics | undefined)[]): AtRiskEntry[] {
    return analytics
        .flatMap((data, i) => (data?.at_risk_students ?? []).map((entry) => ({ ...entry, course: courses[i] })))
        .sort((a, b) => (a.last_engaged_at ?? '').localeCompare(b.last_engaged_at ?? ''));
}

/** The course with the most students at risk — where the "At-risk students" card should lead. */
export function worstAtRiskCourse(entries: AtRiskEntry[]): AtRiskEntry['course'] | undefined {
    const byCourse = new Map<number, { course: AtRiskEntry['course']; n: number }>();
    entries.forEach((e) => byCourse.set(e.course.id, { course: e.course, n: (byCourse.get(e.course.id)?.n ?? 0) + 1 }));
    return [...byCourse.values()].sort((a, b) => b.n - a.n)[0]?.course;
}
