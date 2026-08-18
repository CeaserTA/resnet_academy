import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createAssignment,
    createEvaluation,
    createQuestion,
    createQuestionBank,
    deleteAssignment,
    deleteEvaluation,
    deleteQuestion,
    deleteQuestionBank,
    fetchAssignment,
    fetchAssignmentSubmissions,
    fetchAttempt,
    fetchAttemptReview,
    fetchEvaluation,
    fetchEvaluationAttempts,
    fetchEvaluationOverview,
    fetchGradebook,
    fetchMyEvaluationAttempts,
    fetchQuestionBanks,
    gradeAttempt,
    gradeSubmission,
    importQuestionsCsv,
    startAttempt,
    submitAssignment,
    submitAttempt,
    updateEvaluation,
    type AssignmentPayload,
    type AttemptAnswerInput,
    type EvaluationPayload,
    type QuestionPayload,
    type UpdateEvaluationPayload,
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

/** Student's own attempt history for an evaluation — persists review access across sessions. */
export function useMyEvaluationAttempts(evaluationId: number) {
    return useQuery({
        queryKey: ['evaluations', evaluationId, 'myAttempts'],
        queryFn: () => fetchMyEvaluationAttempts(evaluationId),
        enabled: Number.isFinite(evaluationId),
    });
}

export function useEvaluationOverview(evaluationId: number) {
    return useQuery({
        queryKey: ['evaluations', evaluationId, 'overview'],
        queryFn: () => fetchEvaluationOverview(evaluationId),
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

export function useAttemptReview(attemptId: number | null) {
    return useQuery({
        queryKey: ['attempts', attemptId, 'review'],
        queryFn: () => fetchAttemptReview(attemptId as number),
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
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
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

// ─── Question Banks & Questions ─────────────────────────────────────────────────────────

export function useQuestionBanks(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'questionBanks'],
        queryFn: () => fetchQuestionBanks(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useCreateQuestionBank(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (title: string) => createQuestionBank(courseId, title),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'questionBanks'] }),
    });
}

export function useDeleteQuestionBank(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (bankId: number) => deleteQuestionBank(bankId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'questionBanks'] }),
    });
}

export function useCreateQuestion(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ bankId, payload }: { bankId: number; payload: QuestionPayload }) =>
            createQuestion(bankId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'questionBanks'] }),
    });
}

export function useDeleteQuestion(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (questionId: number) => deleteQuestion(questionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'questionBanks'] }),
    });
}

export function useImportQuestionsCsv(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ bankId, file }: { bankId: number; file: File }) => importQuestionsCsv(bankId, file),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'questionBanks'] }),
    });
}

// ─── Evaluation Update (settings + question sync) ──────────────────────────────────────

export function useUpdateEvaluation(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ evaluationId, payload }: { evaluationId: number; payload: UpdateEvaluationPayload }) =>
            updateEvaluation(evaluationId, payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['evaluations', variables.evaluationId] });
            queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'modules'] });
        },
    });
}
