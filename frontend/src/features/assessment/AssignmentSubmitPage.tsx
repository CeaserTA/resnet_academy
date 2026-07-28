import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';
import { useAssignment, useSubmitAssignment } from '@/features/assessment/useAssessment';

/**
 * FR-11: a student submits file/text (per assignment.submission_type), sees their latest
 * submission's status/grade if any, and can resubmit — the backend recomputes the late
 * penalty from `due_at` on every submit, so this page never guesses the penalty itself.
 */
export function AssignmentSubmitPage() {
    const { id } = useParams();
    const assignmentId = Number(id);
    const [searchParams] = useSearchParams();
    const courseId = Number(searchParams.get('course'));

    const { data: assignment, isLoading } = useAssignment(assignmentId);
    const submit = useSubmitAssignment(assignmentId);

    const [fileUrl, setFileUrl] = useState('');
    const [textContent, setTextContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [justSubmitted, setJustSubmitted] = useState(false);

    if (isLoading || !assignment) {
        return <Spinner />;
    }

    const needsFile = assignment.submission_type === 'file' || assignment.submission_type === 'both';
    const needsText = assignment.submission_type === 'text' || assignment.submission_type === 'both';
    const isOverdue = assignment.due_at !== null && new Date(assignment.due_at) < new Date();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await submit.mutateAsync({
                file_url: needsFile ? fileUrl : undefined,
                text_content: needsText ? textContent : undefined,
            });
            setJustSubmitted(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit the assignment.');
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <Link
                to={`/learn/courses/${courseId}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to course
            </Link>

            <div className="mt-2 flex items-center gap-2">
                <h1 className="text-2xl">{assignment.title}</h1>
                {isOverdue && !justSubmitted && <Badge label="Past due" tone="warning" icon={Clock} />}
            </div>
            {assignment.due_at && (
                <p className="mt-1 text-sm text-ink-600">Due {new Date(assignment.due_at).toLocaleString()}</p>
            )}
            {assignment.instructions && <p className="mt-3 whitespace-pre-wrap text-ink-900">{assignment.instructions}</p>}

            <Card className="mt-6">
                {justSubmitted ? (
                    <Alert
                        variant="success"
                        message="Submission received. Your instructor will grade it and you'll see the score here."
                    />
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        {error && <Alert variant="error" message={error} />}

                        {needsFile && (
                            <Input
                                label="File URL"
                                type="url"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                required
                            />
                        )}
                        {needsText && (
                            <Textarea
                                label="Answer"
                                rows={6}
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                required
                            />
                        )}

                        <Button type="submit" isLoading={submit.isPending} className="self-start">
                            Submit assignment
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
