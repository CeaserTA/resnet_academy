import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createAssignment,
    createEvaluation,
    deleteAssignment,
    deleteEvaluation,
    fetchAssignment,
    fetchAssignmentSubmissions,
    fetchAttempt,
    fetchEvaluation,
    fetchEvaluationAttempts,
    fetchGradebook,
    gradeAttempt,
    gradeSubmission,
    startAttempt,
    submitAssignment,
    submitAttempt,
    type AssignmentPayload,
    type AttemptAnswerInput,
    type EvaluationPayload,
} from '@/features/assessment/api';

export function useCreateAssignment(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleId, payload }: { moduleId: number; payload: AssignmentPayload }) =>
            createAssignment(moduleId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useDeleteAssignment(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (assignmentId: number) => deleteAssignment(assignmentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useCreateEvaluation(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleId, payload }: { moduleId: number; payload: EvaluationPayload }) =>
            createEvaluation(moduleId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useDeleteEvaluation(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (evaluationId: number) => deleteEvaluation(evaluationId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] }),
    });
}

export function useAssignment(assignmentId: number) {
    return useQuery({
        queryKey: ['assignments', assignmentId],
        queryFn: () => fetchAssignment(assignmentId),
        enabled: Number.isFinite(assignmentId),
    });
}

export function useAssignmentSubmissions(assignmentId: number, enabled: boolean) {
    return useQuery({
        queryKey: ['assignments', assignmentId, 'submissions'],
        queryFn: () => fetchAssignmentSubmissions(assignmentId),
        enabled: enabled && Number.isFinite(assignmentId),
    });
}

export function useSubmitAssignment(assignmentId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { file?: File; text_content?: string }) => submitAssignment(assignmentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId] });
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
    });
}

export function useGradeSubmission(assignmentId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            submissionId,
            ...payload
        }: {
            submissionId: number;
            raw_score: number;
            feedback?: string;
            rubric_scores?: { rubric_id: number; score: number; comment?: string }[];
        }) => gradeSubmission(submissionId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId, 'submissions'] });
        },
    });
}

export function useEvaluation(evaluationId: number) {
    return useQuery({
        queryKey: ['evaluations', evaluationId],
        queryFn: () => fetchEvaluation(evaluationId),
        enabled: Number.isFinite(evaluationId),
    });
}

export function useEvaluationAttempts(evaluationId: number) {
    return useQuery({
        queryKey: ['evaluations', evaluationId, 'attempts'],
        queryFn: () => fetchEvaluationAttempts(evaluationId),
        enabled: Number.isFinite(evaluationId),
    });
}

export function useAttempt(attemptId: number | null) {
    return useQuery({
        queryKey: ['attempts', attemptId],
        queryFn: () => fetchAttempt(attemptId as number),
        enabled: attemptId !== null,
    });
}

export function useStartAttempt() {
    return useMutation({
        mutationFn: (evaluationId: number) => startAttempt(evaluationId),
    });
}

export function useSubmitAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ attemptId, answers }: { attemptId: number; answers: AttemptAnswerInput[] }) =>
            submitAttempt(attemptId, answers),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
    });
}

export function useGradeAttempt(evaluationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            attemptId,
            answerGrades,
        }: {
            attemptId: number;
            answerGrades: { answer_id: number; is_correct?: boolean; points_awarded: number }[];
        }) => gradeAttempt(attemptId, answerGrades),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations', evaluationId, 'attempts'] });
        },
    });
}

export function useGradebook(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'gradebook'],
        queryFn: () => fetchGradebook(courseId),
        enabled: Number.isFinite(courseId),
    });
}
