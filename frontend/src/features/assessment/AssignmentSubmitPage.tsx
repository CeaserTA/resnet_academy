import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, FolderOpen, Send, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { useCourse } from '@/features/catalogue/useCourses';
import { ApiError } from '@/lib/api/client';
import { useAssignment, useAssignmentSubmissions, useSubmitAssignment } from '@/features/assessment/useAssessment';
import { useMyEnrolments } from '@/features/enrolment/useEnrolments';
import type { AssignmentSubmission } from '@/lib/api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

const statusTone: Record<string, 'neutral' | 'progress' | 'success' | 'warning'> = {
    submitted: 'progress',
    graded: 'success',
};

// ─── Existing submission card ─────────────────────────────────────────────────

function ExistingSubmission({
    submission,
    onResubmit,
}: {
    submission: AssignmentSubmission;
    onResubmit: () => void;
}) {
    return (
        <Card className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-success-600" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink-900">
                        Attempt #{submission.attempt_number} submitted
                    </h2>
                </div>
                <Badge
                    label={submission.status === 'graded' ? 'Graded' : 'Submitted'}
                    tone={statusTone[submission.status] ?? 'neutral'}
                />
            </div>

            <p className="text-sm text-ink-600">
                Submitted {formatDate(submission.submitted_at)}
                {submission.is_late && (
                    <span className="ml-2 text-warning-600">(late)</span>
                )}
            </p>

            {/* What was submitted */}
            {submission.text_content && (
                <div className="rounded-lg border border-surface-100 bg-surface-50 p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-600">Your answer</p>
                    <p className="whitespace-pre-wrap text-sm text-ink-900">{submission.text_content}</p>
                </div>
            )}
            {submission.file_url && (
                <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                    <FolderOpen className="size-4" aria-hidden="true" />
                    View submitted file
                </a>
            )}

            {/* Grade / feedback */}
            {submission.status === 'graded' && (
                <div className="rounded-lg border border-success-600/20 bg-success-600/5 p-4">
                    <p className="text-sm font-semibold text-ink-900">
                        Score: {submission.final_score ?? submission.raw_score} points
                        {submission.is_late && submission.late_penalty_percent > 0 && (
                            <span className="ml-1 text-xs text-warning-600">
                                ({submission.late_penalty_percent}% late penalty applied)
                            </span>
                        )}
                    </p>
                    {submission.feedback && (
                        <p className="mt-2 text-sm text-ink-600">{submission.feedback}</p>
                    )}
                </div>
            )}

            {/* Resubmit — backend always allows another attempt */}
            <Button variant="secondary" onClick={onResubmit}>
                Submit another attempt
            </Button>
        </Card>
    );
}

// ─── Submission form ──────────────────────────────────────────────────────────

function SubmissionForm({
    assignmentId,
    submissionType,
    onSuccess,
}: {
    assignmentId: number;
    submissionType: string;
    onSuccess: () => void;
}) {
    const submit = useSubmitAssignment(assignmentId);
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const needsFile = submissionType === 'file' || submissionType === 'both';
    const needsText = submissionType === 'text' || submissionType === 'both';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (submissionType === 'file' && !file) {
            setError('Choose a file to submit.');
            return;
        }
        if (submissionType === 'text' && !textContent.trim()) {
            setError('Enter an answer before submitting.');
            return;
        }
        if (submissionType === 'both' && !file && !textContent.trim()) {
            setError('Attach a file or enter a written answer.');
            return;
        }

        try {
            await submit.mutateAsync({
                file: needsFile && file ? file : undefined,
                text_content: needsText && textContent.trim() ? textContent : undefined,
            });
            onSuccess();
        } catch (err) {
            // Surface the actual API error message, not a generic fallback
            if (err instanceof ApiError) {
                if (err.fields) {
                    const first = Object.values(err.fields)[0]?.[0];
                    setError(first ?? err.message);
                } else {
                    setError(err.message);
                }
            } else {
                setError('Something went wrong. Try again.');
            }
        }
    };

    return (
        <Card className="mt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Upload className="size-5 text-blue-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-ink-900">Your submission</h2>
                </div>

                {error && <Alert variant="error" message={error} />}

                <div className="flex flex-col gap-4 rounded-lg border border-dashed border-surface-100 bg-surface-50 p-4">
                    {needsFile && (
                        <div>
                            <p className="text-sm font-medium text-ink-900">
                                {submissionType === 'both'
                                    ? 'Attach a file (or answer in the text box below)'
                                    : 'Upload your file for this assignment'}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-600">
                                Max file size: 20 MB. Any file type accepted.
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FolderOpen className="size-4" aria-hidden="true" />
                                    Choose file
                                </Button>
                                <span className="text-sm text-ink-600">
                                    {file ? file.name : 'No file chosen'}
                                </span>
                            </div>
                        </div>
                    )}

                    {needsText && (
                        <Textarea
                            label="Written answer"
                            rows={7}
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Type your answer here…"
                        />
                    )}
                </div>

                <Button
                    type="submit"
                    isLoading={submit.isPending}
                    className="w-full justify-center"
                >
                    <Send className="size-4" aria-hidden="true" />
                    {submit.isPending ? 'Submitting…' : 'Submit Assignment'}
                </Button>
            </form>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AssignmentSubmitPage() {
    const { id } = useParams();
    const assignmentId = Number(id);
    const [searchParams] = useSearchParams();
    const courseId = Number(searchParams.get('course'));

    const { data: course } = useCourse(courseId);
    const { data: assignment, isLoading: assignmentLoading } = useAssignment(assignmentId);
    const { data: enrolmentsPage, isLoading: enrolmentsLoading } = useMyEnrolments();
    const { data: submissions, isLoading: submissionsLoading } = useAssignmentSubmissions(
        assignmentId,
        !!assignment,
    );

    // Allow re-showing the form after seeing an existing submission
    const [showResubmitForm, setShowResubmitForm] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);

    // ── Loading ──
    if (assignmentLoading || enrolmentsLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    // ── Assignment not found ──
    if (!assignment) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p className="text-ink-600">Assignment not found.</p>
                <Link to="/dashboard" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
                    Back to my courses
                </Link>
            </div>
        );
    }

    // ── Enrolment check ──
    // courseId comes from ?course=X query param. If missing (bookmarked link,
    // notification deep-link, etc.) we skip the check rather than blocking
    // a potentially valid student — the backend Policy will still reject an
    // unauthorised submit attempt, so security is not compromised.
    const enrolments = enrolmentsPage?.data ?? [];
    const isEnrolled = !courseId || enrolments.some(
        (e) => e.course?.id === courseId && e.status === 'confirmed',
    );

    if (!isEnrolled) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-12">
                <Alert
                    variant="error"
                    message="You need to be enrolled in this course to submit this assignment."
                />
                <Link
                    to={`/courses/${courseId}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                    ← View course and enrol
                </Link>
            </div>
        );
    }

    const isOverdue = assignment.due_at !== null && new Date(assignment.due_at) < new Date();

    // Latest submission (most recent attempt)
    const latestSubmission: AssignmentSubmission | null =
        !submissionsLoading && submissions && submissions.length > 0
            ? submissions[0]
            : null;

    const hasExistingSubmission = !!latestSubmission && !showResubmitForm && !justSubmitted;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-ink-600">
                <Link to="/dashboard" className="hover:text-blue-600">My Courses</Link>
                {course && (
                    <>
                        <span aria-hidden="true">/</span>
                        <Link to={`/learn/courses/${courseId}`} className="hover:text-blue-600">
                            {course.title}
                        </Link>
                    </>
                )}
                <span aria-hidden="true">/</span>
                <span className="text-ink-900">{assignment.title}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-wrap items-start gap-3">
                <h1 className="text-2xl font-bold text-ink-900">{assignment.title}</h1>
                {isOverdue && !justSubmitted && (
                    <Badge label="Past due" tone="warning" icon={Clock} />
                )}
            </div>

            {assignment.due_at && (
                <p className="mt-1 text-sm text-ink-600">
                    Due {formatDate(assignment.due_at)}
                    {!assignment.allow_late && isOverdue && (
                        <span className="ml-2 text-danger-600 font-medium">· Late submissions not accepted</span>
                    )}
                </p>
            )}

            {assignment.instructions && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-900">
                    {assignment.instructions}
                </p>
            )}

            {/* Max score */}
            <p className="mt-2 text-sm text-ink-600">
                Max score: <span className="font-medium text-ink-900">{assignment.max_score} points</span>
            </p>

            {/* Blocked: late submission not allowed */}
            {isOverdue && !assignment.allow_late && !latestSubmission && (
                <Alert
                    variant="error"
                    message="The deadline has passed and late submissions are not accepted for this assignment."
                    className="mt-6"
                />
            )}

            {/* Success confirmation */}
            {justSubmitted && (
                <Alert
                    variant="success"
                    message="Submission received. Your instructor will review and grade it — you'll see the score here once it's done."
                    className="mt-6"
                />
            )}

            {/* Existing submission view */}
            {hasExistingSubmission && latestSubmission && (
                <ExistingSubmission
                    submission={latestSubmission}
                    onResubmit={() => setShowResubmitForm(true)}
                />
            )}

            {/* Submission form */}
            {!hasExistingSubmission && !justSubmitted && !(isOverdue && !assignment.allow_late) && (
                <SubmissionForm
                    assignmentId={assignmentId}
                    submissionType={assignment.submission_type}
                    onSuccess={() => {
                        setShowResubmitForm(false);
                        setJustSubmitted(true);
                    }}
                />
            )}
        </div>
    );
}
