import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
    Award,
    CheckCircle2,
    Clock,
    FileText,
    FolderOpen,
    Send,
    Upload,
} from 'lucide-react';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Existing submission panel ────────────────────────────────────────────────

function ExistingSubmission({ submission, onResubmit }: { submission: AssignmentSubmission; onResubmit: () => void }) {
    const isGraded = submission.status === 'graded';
    const score = submission.final_score ?? submission.raw_score;

    return (
        <div className="flex flex-col gap-4">
            {/* Status header */}
            <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-success-600" aria-hidden="true" />
                        <p className="text-sm font-semibold text-ink-900">
                            Attempt #{submission.attempt_number}
                        </p>
                    </div>
                    <Badge
                        label={isGraded ? 'Graded' : 'Submitted'}
                        tone={isGraded ? 'success' : 'progress'}
                    />
                </div>
                <div className="px-4 py-3">
                    <p className="text-xs text-ink-400">
                        Submitted {formatDate(submission.submitted_at)}
                        {submission.is_late && <span className="ml-2 text-amber-600">(late)</span>}
                    </p>
                </div>
            </div>

            {/* Grade result */}
            {isGraded && score !== null && (
                <div className="overflow-hidden rounded-xl border border-success-600/20 bg-success-600/5 shadow-sm">
                    <div className="border-b border-success-600/10 bg-success-600/8 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Award className="size-4 text-success-600" aria-hidden="true" />
                            <p className="text-sm font-semibold text-ink-900">Your grade</p>
                        </div>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-2xl font-bold text-success-600">{score} pts</p>
                        {submission.is_late && Number(submission.late_penalty_percent) > 0 && (
                            <p className="mt-0.5 text-xs text-amber-600">
                                {submission.late_penalty_percent}% late penalty applied
                            </p>
                        )}
                        {submission.feedback && (
                            <p className="mt-3 text-sm text-ink-600 border-t border-success-600/10 pt-3">
                                {submission.feedback}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Submitted content */}
            {submission.text_content && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <div className="border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Your answer</p>
                    </div>
                    <p className="whitespace-pre-wrap px-4 py-3 text-sm text-ink-900 leading-relaxed">
                        {submission.text_content}
                    </p>
                </div>
            )}

            {submission.file_url && (
                <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-surface-100 bg-surface-0 px-4 py-3 text-sm text-blue-600 shadow-sm hover:bg-surface-50 hover:underline"
                >
                    <FolderOpen className="size-4 shrink-0" aria-hidden="true" />
                    View submitted file
                </a>
            )}

            <Button variant="secondary" size="sm" onClick={onResubmit} className="self-start">
                Submit another attempt
            </Button>
        </div>
    );
}

// ─── Submission form ──────────────────────────────────────────────────────────

function SubmissionForm({ assignmentId, submissionType, onSuccess }: {
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

        if (submissionType === 'file' && !file) { setError('Choose a file to submit.'); return; }
        if (submissionType === 'text' && !textContent.trim()) { setError('Enter an answer before submitting.'); return; }
        if (submissionType === 'both' && !file && !textContent.trim()) { setError('Attach a file or enter a written answer.'); return; }

        try {
            await submit.mutateAsync({
                file: needsFile && file ? file : undefined,
                text_content: needsText && textContent.trim() ? textContent : undefined,
            });
            onSuccess();
        } catch (err) {
            if (err instanceof ApiError) {
                const first = err.fields ? Object.values(err.fields)[0]?.[0] : undefined;
                setError(first ?? err.message);
            } else {
                setError('Something went wrong. Try again.');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && <Alert variant="error" message={error} />}

            <div className="overflow-hidden rounded-xl border border-dashed border-surface-100 bg-surface-50">
                <div className="border-b border-surface-100 bg-surface-0 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Upload className="size-4 text-blue-600" aria-hidden="true" />
                        <p className="text-sm font-semibold text-ink-900">Your submission</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                    {needsFile && (
                        <div>
                            <p className="text-sm font-medium text-ink-900">
                                {submissionType === 'both'
                                    ? 'Attach a file (optional if you answer below)'
                                    : 'Upload your file'}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-400">Max 20 MB · Any file type</p>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                                <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                    <FolderOpen className="size-3.5" aria-hidden="true" />
                                    Choose file
                                </Button>
                                <span className="text-xs text-ink-400">
                                    {file ? file.name : 'No file chosen'}
                                </span>
                            </div>
                        </div>
                    )}

                    {needsText && (
                        <Textarea
                            label="Written answer"
                            rows={8}
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Type your answer here…"
                        />
                    )}
                </div>
            </div>

            <Button type="submit" isLoading={submit.isPending} className="w-full justify-center">
                <Send className="size-4" aria-hidden="true" />
                {submit.isPending ? 'Submitting…' : 'Submit assignment'}
            </Button>
        </form>
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
    const { data: submissions, isLoading: submissionsLoading } = useAssignmentSubmissions(assignmentId, !!assignment);

    const [showResubmitForm, setShowResubmitForm] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);

    if (assignmentLoading || enrolmentsLoading) {
        return <div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>;
    }

    if (!assignment) {
        return (
            <div className="mx-auto max-w-xl py-12 text-center">
                <p className="text-ink-600">Assignment not found.</p>
                <Link to="/dashboard" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                    Back to my courses
                </Link>
            </div>
        );
    }

    const enrolments = enrolmentsPage?.data ?? [];
    const isEnrolled = !courseId || enrolments.some((e) => e.course?.id === courseId && e.status === 'confirmed');

    if (!isEnrolled) {
        return (
            <div className="mx-auto max-w-xl py-12">
                <Alert variant="error" message="You need to be enrolled in this course to submit this assignment." />
                <Link to={`/courses/${courseId}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    ← View course and enrol
                </Link>
            </div>
        );
    }

    const isOverdue = assignment.due_at !== null && new Date(assignment.due_at) < new Date();
    const latestSubmission: AssignmentSubmission | null =
        !submissionsLoading && submissions && submissions.length > 0 ? submissions[0] : null;
    const hasExistingSubmission = !!latestSubmission && !showResubmitForm && !justSubmitted;

    // Completion progress for the progress bar
    const attemptCount = submissions?.length ?? 0;

    return (
        <div className="mx-auto max-w-5xl space-y-4">

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-400">
                <Link to="/dashboard" className="hover:text-blue-600">My courses</Link>
                {course && (
                    <>
                        <span aria-hidden="true">/</span>
                        <Link to={`/learn/courses/${courseId}`} className="hover:text-blue-600">{course.title}</Link>
                    </>
                )}
                <span aria-hidden="true">/</span>
                <span className="text-ink-600">{assignment.title}</span>
            </nav>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">

                {/* LEFT — assignment details (1/3) */}
                <div className="flex flex-col gap-3">

                    {/* Assignment info card */}
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="size-4 text-blue-600 shrink-0" aria-hidden="true" />
                                    <h1 className="text-sm font-semibold text-ink-900 leading-tight">{assignment.title}</h1>
                                </div>
                                {isOverdue && !justSubmitted && (
                                    <Badge label="Past due" tone="warning" icon={Clock} />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 p-4">
                            {/* Due date */}
                            {assignment.due_at && (
                                <div className="flex items-start justify-between gap-2 text-xs">
                                    <span className="text-ink-400">Due</span>
                                    <span className={isOverdue ? 'font-medium text-danger-600' : 'text-ink-900'}>
                                        {formatDate(assignment.due_at)}
                                    </span>
                                </div>
                            )}

                            {/* Max score */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-ink-400">Max score</span>
                                <span className="font-semibold text-ink-900">{assignment.max_score} pts</span>
                            </div>

                            {/* Submission type */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-ink-400">Type</span>
                                <span className="capitalize text-ink-900">{assignment.submission_type.replace('_', ' ')}</span>
                            </div>

                            {/* Attempts */}
                            {attemptCount > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-ink-400">Attempts</span>
                                    <span className="text-ink-900">{attemptCount}</span>
                                </div>
                            )}

                            {/* Late policy note */}
                            {!assignment.allow_late && (
                                <p className="rounded-lg bg-danger-600/5 px-3 py-2 text-xs text-danger-600">
                                    Late submissions are not accepted.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    {assignment.instructions && (
                        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                            <div className="border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                                <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Instructions</p>
                            </div>
                            <p className="whitespace-pre-wrap px-4 py-3 text-sm text-ink-900 leading-relaxed">
                                {assignment.instructions}
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT — submission area (2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-3">

                    {/* Success */}
                    {justSubmitted && (
                        <Alert
                            variant="success"
                            message="Submission received. Your instructor will review and grade it — you'll see the score here once it's done."
                        />
                    )}

                    {/* Blocked: overdue + no late submissions */}
                    {isOverdue && !assignment.allow_late && !latestSubmission && (
                        <Alert
                            variant="error"
                            message="The deadline has passed and late submissions are not accepted."
                        />
                    )}

                    {/* Existing submission */}
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
            </div>
        </div>
    );
}
