import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useSubmitCourseApplication } from '@/features/courseApplications/useCourseApplications';
import { ApiError } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';

export function ApplicationModal({
    course,
    onClose,
    onSubmitted,
}: {
    course: Course;
    onClose: () => void;
    onSubmitted: () => void;
}) {
    const submitApplication = useSubmitCourseApplication();
    const questions = course.application_questions ?? [];
    const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [alternativeProof, setAlternativeProof] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((current) => current.map((answer, i) => (i === index ? value : answer)));
    };

    const handleSubmit = async () => {
        setError(null);

        if (course.application_require_portfolio_url && !portfolioUrl.trim()) {
            setError('A portfolio/link URL is required for this course.');
            return;
        }

        try {
            await submitApplication.mutateAsync({
                course_id: course.id,
                answers,
                portfolio_url: portfolioUrl.trim() || undefined,
                alternative_proof_text: alternativeProof.trim() || undefined,
            });
            onSubmitted();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit your application. Try again.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Apply to enrol"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={submitApplication.isPending}>
                        Submit application
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                {course.level === 'advanced' && (
                    <div className="flex flex-col gap-2 rounded-md bg-amber-100 p-4">
                        <Badge label="Advanced course" tone="warning" icon={AlertTriangle} />
                        <p className="text-sm text-ink-900">
                            This is an advanced course. If you&apos;re newer to the subject, consider starting with a{' '}
                            <Link to="/courses?level=beginner" className="text-blue-600 hover:underline">
                                beginner course
                            </Link>{' '}
                            first.
                        </p>
                    </div>
                )}

                {questions.map((question, index) => (
                    <Textarea
                        key={index}
                        label={question}
                        rows={3}
                        value={answers[index] ?? ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                    />
                ))}

                {course.application_require_portfolio_url && (
                    <Input
                        label="Portfolio or project link"
                        type="url"
                        placeholder="https://…"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                    />
                )}

                {course.application_allow_alternative_proof && (
                    <div>
                        <Textarea
                            label="Alternative proof of skill (optional)"
                            rows={3}
                            placeholder="No formal background? Share a side project, personal statement, or anything else that shows your readiness."
                            value={alternativeProof}
                            onChange={(e) => setAlternativeProof(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
