import { useQueries } from '@tanstack/react-query';
import { fetchAssignmentSubmissions, fetchEvaluationAttempts } from '@/features/assessment/api';
import type { AssignmentModuleItem, AssignmentSubmission, EvaluationAttempt, EvaluationModuleItem, Module } from '@/lib/api/types';

export type AssessmentItem = { module: Module; courseId: number; courseTitle: string } & (AssignmentModuleItem | EvaluationModuleItem);

/** Work a student has handed in that still needs a mark. */
export interface GradingTask {
    key: string;
    kind: 'assignment' | 'quiz';
    itemTitle: string;
    courseTitle: string;
    studentName: string;
    submittedAt: string;
    href: string;
}

/** Every assignment and quiz in the given modules, in module then item order. */
export function assessmentItems(modules: Module[], courseId: number, courseTitle: string): AssessmentItem[] {
    return [...modules]
        .sort((a, b) => a.order_index - b.order_index)
        .flatMap((module) =>
            module.items
                .filter((item): item is AssignmentModuleItem | EvaluationModuleItem => item.item_type === 'assignment' || item.item_type === 'evaluation')
                .sort((a, b) => a.order_index - b.order_index)
                .map((item) => ({ ...item, module, courseId, courseTitle })),
        );
}

/**
 * Submissions (assignments) and finished attempts (quizzes) for each item — same query keys and
 * data as the grading pages, so opening one after the other reuses the cache.
 */
export function useAssessmentActivity(items: AssessmentItem[]) {
    const results = useQueries({
        queries: items.map((item) =>
            item.item_type === 'assignment'
                ? { queryKey: ['assignments', item.id, 'submissions'], queryFn: () => fetchAssignmentSubmissions(item.id) }
                : { queryKey: ['evaluations', item.id, 'attempts'], queryFn: () => fetchEvaluationAttempts(item.id) },
        ),
    });

    const perItem = items.map((item, i) => {
        const data = results[i]?.data as (AssignmentSubmission | EvaluationAttempt)[] | undefined;
        const handedIn = (data ?? []).filter((d) => d.status !== 'in_progress');
        const waiting = handedIn.filter((d) => d.status === 'submitted');
        return { item, isLoading: results[i]?.isLoading ?? true, submitted: handedIn.length, waiting };
    });

    const tasks: GradingTask[] = perItem
        .flatMap(({ item, waiting }) =>
            waiting.map((w) => ({
                key: `${item.item_type}-${item.id}-${w.id}`,
                kind: item.item_type === 'assignment' ? ('assignment' as const) : ('quiz' as const),
                itemTitle: item.title,
                courseTitle: item.courseTitle,
                studentName: w.student?.name ?? 'Student',
                submittedAt: w.submitted_at ?? '',
                href: item.item_type === 'assignment' ? `/admin/assignments/${item.id}` : `/admin/evaluations/${item.id}/grading`,
            })),
        )
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

    return { perItem, tasks, isLoading: results.some((r) => r.isLoading) };
}
