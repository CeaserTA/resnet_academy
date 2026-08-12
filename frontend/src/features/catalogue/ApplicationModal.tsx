import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, UserCircle } from 'lucide-react';
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
    sectionId,
}: {
    course: Course;
    onClose: () => void;
    onSubmitted: () => void;
    sectionId?: number;
}) {
    const submitApplication = useSubmitCourseApplication();
    const navigate = useNavigate();
    const questions = course.application_questions ?? [];
    const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [alternativeProof, setAlternativeProof] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [profileIncompleteError, setProfileIncompleteError] = useState<{
        message: string;
        missingFields: string[];
    } | null>(null);

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((current) => current.map((answer, i) => (i === index ? value : answer)));
    };

    const handleSubmit = async () => {
        setError(null);
        setProfileIncompleteError(null);

        if (course.application_require_portfolio_url && !portfolioUrl.trim()) {
            setError('A portfolio/link URL is required for this course.');
            return;
        }

        try {
            await submitApplication.mutateAsync({
                course_id: course.id,
                section_id: sectionId,
                answers,
                portfolio_url: portfolioUrl.trim() || undefined,
                alternative_proof_text: alternativeProof.trim() || undefined,
            });
            onSubmitted();
        } catch (err) {
            // Requirement 5.2, 5.3, 5.4: Detect 403 error with profile_incomplete code
            if (err instanceof ApiError && err.code === 'profile_incomplete') {
                // Requirement 7.1: Store current URL for return-to-context navigation
                sessionStorage.setItem('returnUrl', window.location.pathname);
                
                setProfileIncompleteError({
                    message: err.message,
                    missingFields: err.missing_fields || [],
                });
            } else {
                setError(err instanceof ApiError ? err.message : 'Could not submit your application. Try again.');
            }
        }
    };

    // Requirement 5.4: Navigate to profile completion
    const handleCompleteProfile = () => {
        onClose();
        navigate('/profile/complete');
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
                    {profileIncompleteError ? (
                        <Button onClick={handleCompleteProfile}>
                            <UserCircle className="size-4" aria-hidden="true" />
                            Complete Profile
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} isLoading={submitApplication.isPending}>
                            Submit application
                        </Button>
                    )}
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}

                {/* Requirement 5.3, 5.4: Display profile incomplete error with missing fields */}
                {profileIncompleteError && (
                    <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <UserCircle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
                            <div className="flex-1">
                                <p className="font-medium text-amber-900">{profileIncompleteError.message}</p>
                                {profileIncompleteError.missingFields.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-amber-800">Missing fields:</p>
                                        <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
                                            {profileIncompleteError.missingFields.map((field) => (
                                                <li key={field} className="capitalize">
                                                    {field.replace(/_/g, ' ')}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <p className="mt-2 text-sm text-amber-800">
                                    Click "Complete Profile" below to add the required information.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Only show application form if profile is complete */}
                {!profileIncompleteError && (
                    <>
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
                    </>
                )}
            </div>
        </Modal>
    );
}
