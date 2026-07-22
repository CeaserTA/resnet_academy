import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useCourses } from '@/features/catalogue/useCourses';
import { importEnrolmentsCsv } from '@/features/admin/enrolments/api';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';

export function BulkImportPage() {
    const { data: courses } = useCourses({});
    const [courseId, setCourseId] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const importMutation = useMutation({
        mutationFn: ({ courseId, file }: { courseId: number; file: File }) => importEnrolmentsCsv(courseId, file),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccess(false);

        const file = fileInputRef.current?.files?.[0];

        if (!courseId || !file) {
            setFormError('Choose a course and a CSV file.');
            return;
        }

        try {
            await importMutation.mutateAsync({ courseId: Number(courseId), file });
            setSuccess(true);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : 'Could not queue the import.');
        }
    };

    return (
        <div className="mx-auto max-w-xl">
            <h1 className="text-2xl">Bulk enrolment import</h1>
            <p className="mt-1 text-sm text-ink-600">
                Upload a CSV with an <code className="rounded bg-surface-100 px-1 font-mono text-xs">email</code>{' '}
                column. Students already enrolled in the course are skipped automatically.
            </p>

            <Card className="mt-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {formError && <Alert variant="error" message={formError} />}
                    {success && (
                        <Alert
                            variant="success"
                            message="Import queued — enrolments will appear shortly. Duplicates and unknown emails are skipped, not errored."
                        />
                    )}

                    <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                        <option value="">Select a course</option>
                        {courses?.data.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </Select>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="csv-file" className="text-sm font-medium text-ink-900">
                            CSV file
                        </label>
                        <input
                            id="csv-file"
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-600"
                        />
                    </div>

                    <Button type="submit" isLoading={importMutation.isPending}>
                        <Upload className="size-4" aria-hidden="true" />
                        Queue import
                    </Button>
                </form>
            </Card>
        </div>
    );
}
