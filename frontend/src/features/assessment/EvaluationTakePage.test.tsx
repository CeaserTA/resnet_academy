import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import { EvaluationTakePage } from '@/features/assessment/EvaluationTakePage';
import { fetchMyEvaluationAttempts } from '@/features/assessment/api';
import type { EvaluationAttempt, EvaluationOverview, StartAttemptResponse } from '@/lib/api/types';

const { startResponse, gradedAttempt, overview } = vi.hoisted(() => {
    const startResponse: StartAttemptResponse = {
        attempt: {
            id: 99,
            evaluation_id: 5,
            student: null,
            attempt_number: 1,
            started_at: new Date().toISOString(),
            submitted_at: null,
            score_percent: null,
            passed: null,
            status: 'in_progress',
            answers: [],
        },
        questions: [
            {
                id: 1,
                type: 'mcq_single',
                question_text: 'What is 2 + 2?',
                points: '10',
                options: [
                    { id: 11, option_text: '3' },
                    { id: 12, option_text: '4' },
                ],
            },
        ],
        evaluation: { id: 5, title: 'Quick check', pass_score: '70', time_limit_minutes: null },
    };

    const gradedAttempt: EvaluationAttempt = {
        ...startResponse.attempt,
        submitted_at: new Date().toISOString(),
        score_percent: '100.00',
        passed: true,
        status: 'graded',
    };

    const overview: EvaluationOverview = {
        id: 5,
        title: 'Quick check',
        description: null,
        instructions: 'Read each question carefully.',
        pass_score: '70',
        time_limit_minutes: null,
        max_attempts: null,
        question_count: 1,
        total_points: 10,
        attempts_used: 0,
        attempts_remaining: null,
        in_progress_attempt: null,
    };

    return { startResponse, gradedAttempt, overview };
});

vi.mock('@/features/assessment/api', () => ({
    fetchEvaluationOverview: vi.fn().mockResolvedValue(overview),
    fetchMyEvaluationAttempts: vi.fn().mockResolvedValue([]),
    startAttempt: vi.fn().mockResolvedValue(startResponse),
    submitAttempt: vi.fn().mockResolvedValue(gradedAttempt),
}));

beforeEach(() => {
    // jsdom's confirm() returns false by default; the start flow gates on it.
    vi.stubGlobal('confirm', vi.fn(() => true));
});

it('shows instructions first, then lets a student answer a question and see whether they passed', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/learn/evaluations/5?course=1']}>
                <Routes>
                    <Route path="/learn/evaluations/:id" element={<EvaluationTakePage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    // Pre-start instructions screen.
    expect(await screen.findByText('Read each question carefully.')).toBeInTheDocument();
    expect(screen.getByText('No time limit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start Evaluation' }));

    expect(await screen.findByText('1. What is 2 + 2?')).toBeInTheDocument();
    // Never shown an answer key on this screen.
    expect(screen.queryByText(/is_correct/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('4'));
    await user.click(screen.getByRole('button', { name: 'Submit attempt' }));

    expect(await screen.findByText('Score: 100.00%')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
});

it('hides the start button once the student has passed, but keeps past attempts reviewable', async () => {
    const passedAttempt: EvaluationAttempt = {
        ...startResponse.attempt,
        id: 50,
        submitted_at: new Date().toISOString(),
        score_percent: '100.00',
        passed: true,
        status: 'graded',
    };
    vi.mocked(fetchMyEvaluationAttempts).mockResolvedValueOnce([passedAttempt]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/learn/evaluations/5?course=1']}>
                <Routes>
                    <Route path="/learn/evaluations/:id" element={<EvaluationTakePage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    expect(await screen.findByText('Past Attempts')).toBeInTheDocument();
    expect(screen.getByText(/You have already completed this evaluation/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Evaluation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Results' })).toBeInTheDocument();
});
