import { apiClient } from '@/lib/api/client';
import { postFormData, toFormData } from '@/lib/api/formData';
import type {
    Assignment,
    AssignmentSubmission,
    AssignmentSubmissionType,
    Evaluation,
    EvaluationAttempt,
    Gradebook,
    PaginatedResponse,
    Question,
    QuestionBank,
    QuestionType,
    StartAttemptResponse,
} from '@/lib/api/types';

export interface AssignmentPayload {
    title: string;
    instructions?: string;
    submission_type: AssignmentSubmissionType;
    due_at?: string;
    allow_late?: boolean;
    max_score?: number;
    is_required?: boolean;
}

export async function createAssignment(moduleId: number, payload: AssignmentPayload): Promise<Assignment> {
    const { data } = await apiClient.post<{ data: Assignment }>(`/modules/${moduleId}/assignments`, payload);
    return data.data;
}

export async function deleteAssignment(assignmentId: number): Promise<void> {
    await apiClient.delete(`/assignments/${assignmentId}`);
}

export interface EvaluationPayload {
    title: string;
    description?: string;
    pass_score: number;
    max_attempts?: number;
    time_limit_minutes?: number;
    randomize_questions?: boolean;
    questions_per_attempt?: number;
    available_from?: string;
    available_until?: string;
    is_required?: boolean;
    question_ids?: number[];
}

export interface UpdateEvaluationPayload {
    title?: string;
    description?: string | null;
    pass_score?: number;
    max_attempts?: number | null;
    time_limit_minutes?: number | null;
    randomize_questions?: boolean;
    questions_per_attempt?: number | null;
    available_from?: string | null;
    available_until?: string | null;
    is_required?: boolean;
    order_index?: number;
    question_ids?: number[] | null;
}

export async function updateEvaluation(evaluationId: number, payload: UpdateEvaluationPayload): Promise<Evaluation> {
    const { data } = await apiClient.patch<{ data: Evaluation }>(`/evaluations/${evaluationId}`, payload);
    return data.data;
}

export async function createEvaluation(moduleId: number, payload: EvaluationPayload): Promise<Evaluation> {
    const { data } = await apiClient.post<{ data: Evaluation }>(`/modules/${moduleId}/evaluations`, payload);
    return data.data;
}

export async function deleteEvaluation(evaluationId: number): Promise<void> {
    await apiClient.delete(`/evaluations/${evaluationId}`);
}

// ─── Question Banks & Questions ─────────────────────────────────────────────────────────

export async function fetchQuestionBanks(courseId: number): Promise<QuestionBank[]> {
    const { data } = await apiClient.get<{ data: QuestionBank[] }>(`/courses/${courseId}/question-banks`);
    return data.data;
}

export async function createQuestionBank(courseId: number, title: string): Promise<QuestionBank> {
    const { data } = await apiClient.post<{ data: QuestionBank }>(`/courses/${courseId}/question-banks`, { title });
    return data.data;
}

export async function deleteQuestionBank(bankId: number): Promise<void> {
    await apiClient.delete(`/question-banks/${bankId}`);
}

export interface QuestionPayload {
    type: QuestionType;
    question_text: string;
    points?: number;
    options?: { option_text: string; is_correct?: boolean }[];
}

export async function createQuestion(bankId: number, payload: QuestionPayload): Promise<Question> {
    const { data } = await apiClient.post<{ data: Question }>(`/question-banks/${bankId}/questions`, payload);
    return data.data;
}

export async function deleteQuestion(questionId: number): Promise<void> {
    await apiClient.delete(`/questions/${questionId}`);
}

export async function fetchAssignment(assignmentId: number): Promise<Assignment> {
    const { data } = await apiClient.get<{ data: Assignment }>(`/assignments/${assignmentId}`);
    return data.data;
}

export async function submitAssignment(
    assignmentId: number,
    payload: { file?: File; text_content?: string },
): Promise<AssignmentSubmission> {
    if (payload.file) {
        const response = await postFormData<{ data: AssignmentSubmission }>(
            `/assignments/${assignmentId}/submissions`,
            toFormData(payload),
        );
        return response.data;
    }

    const { data } = await apiClient.post<{ data: AssignmentSubmission }>(
        `/assignments/${assignmentId}/submissions`,
        payload,
    );
    return data.data;
}

export async function fetchAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
    const { data } = await apiClient.get<PaginatedResponse<AssignmentSubmission>>(
        `/assignments/${assignmentId}/submissions`,
    );
    return data.data;
}

export async function gradeSubmission(
    submissionId: number,
    payload: {
        raw_score: number;
        feedback?: string;
        rubric_scores?: { rubric_id: number; score: number; comment?: string }[];
    },
): Promise<AssignmentSubmission> {
    const { data } = await apiClient.post<{ data: AssignmentSubmission }>(
        `/submissions/${submissionId}/grade`,
        payload,
    );
    return data.data;
}

export async function fetchEvaluation(evaluationId: number): Promise<Evaluation> {
    const { data } = await apiClient.get<{ data: Evaluation }>(`/evaluations/${evaluationId}`);
    return data.data;
}

export async function fetchEvaluationAttempts(evaluationId: number): Promise<EvaluationAttempt[]> {
    const { data } = await apiClient.get<PaginatedResponse<EvaluationAttempt>>(
        `/evaluations/${evaluationId}/attempts`,
    );
    return data.data;
}

export async function startAttempt(evaluationId: number): Promise<StartAttemptResponse> {
    const { data } = await apiClient.post<{ data: StartAttemptResponse }>(`/evaluations/${evaluationId}/attempts`);
    return data.data;
}

export async function fetchAttempt(attemptId: number): Promise<EvaluationAttempt> {
    const { data } = await apiClient.get<{ data: EvaluationAttempt }>(`/attempts/${attemptId}`);
    return data.data;
}

export interface AttemptAnswerInput {
    question_id: number;
    selected_option_ids?: number[];
    answer_text?: string;
}

export async function submitAttempt(attemptId: number, answers: AttemptAnswerInput[]): Promise<EvaluationAttempt> {
    const { data } = await apiClient.post<{ data: EvaluationAttempt }>(`/attempts/${attemptId}/submit`, { answers });
    return data.data;
}

export async function gradeAttempt(
    attemptId: number,
    answerGrades: { answer_id: number; is_correct?: boolean; points_awarded: number }[],
): Promise<EvaluationAttempt> {
    const { data } = await apiClient.post<{ data: EvaluationAttempt }>(`/attempts/${attemptId}/grade`, {
        answer_grades: answerGrades,
    });
    return data.data;
}

export async function fetchGradebook(courseId: number): Promise<Gradebook> {
    const { data } = await apiClient.get<{ data: Gradebook }>(`/courses/${courseId}/gradebook`);
    return data.data;
}
