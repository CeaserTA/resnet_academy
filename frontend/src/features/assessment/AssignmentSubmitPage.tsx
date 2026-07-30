import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Clock, FolderOpen, Send, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useCourse } from '@/features/catalogue/useCourses';
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

    const { data: course } = useCourse(courseId);
    const { data: assignment, isLoading } = useAssignment(assignmentId);
    const submit = useSubmitAssignment(assignmentId);

    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [textContent, setTextContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [justSubmitted, setJustSubmitted] = useState(false);

    if (isLoading || !assignment) {
        return <Spinner />;
    }

    const needsFile = assignment.submission_type === 'file' || assignment.submission_type === 'both';
    const needsText = assignment.submission_type === 'text' || assignment.submission_type === 'both';
    const isOverdue = assignment.due_at !== null && new Date(assignment.due_at) < new Date();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (assignment.submission_type === 'file' && !file) {
            setError('Choose a file to submit.');
            return;
        }
        if (assignment.submission_type === 'text' && !textContent.trim()) {
            setError('Enter an answer before submitting.');
            return;
        }
        if (assignment.submission_type === 'both' && !file && !textContent.trim()) {
            setError('Attach a file or enter an answer.');
            return;
        }

        try {
            await submit.mutateAsync({
                file: needsFile && file ? file : undefined,
                text_content: needsText ? textContent : undefined,
            });
            setJustSubmitted(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit the assignment.');
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <Breadcrumbs
                items={[
                    { label: 'My Courses', to: '/dashboard' },
                    { label: course?.title ?? '', to: `/learn/courses/${courseId}` },
                    { label: assignment.title },
                ]}
            />

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
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Upload className="size-5 text-blue-600" aria-hidden="true" />
                            <h2 className="text-lg text-ink-900">Submission</h2>
                        </div>

                        {error && <Alert variant="error" message={error} />}

                        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-surface-100 bg-surface-50 p-4">
                            {needsFile && (
                                <div>
                                    <p className="text-sm text-ink-900">Upload your file for this assignment.</p>
                                    <p className="text-sm text-ink-600">
                                        {assignment.submission_type === 'both'
                                            ? 'Optional if you answer below instead.'
                                            : 'Any file type is accepted.'}
                                    </p>

                                    <div className="mt-3 flex items-center gap-3">
                                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                            <FolderOpen className="size-4" aria-hidden="true" />
                                            Choose File
                                        </Button>
                                        <span className="text-sm text-ink-600">{file ? file.name : 'No file chosen'}</span>
                                    </div>
                                </div>
                            )}

                            {needsText && (
                                <Textarea
                                    label="Answer"
                                    rows={6}
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                />
                            )}
                        </div>

                        <Button type="submit" isLoading={submit.isPending} className="w-full justify-center">
                            <Send className="size-4" aria-hidden="true" />
                            Submit Assignment
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
