import { useState } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCourses } from '@/features/catalogue/useCourses';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/features/communication/useCommunication';

/**
 * Course builder redesign: announcements are created (and reviewed/deleted) from the
 * notification bell instead of a panel embedded in the course builder — the bell is global, so
 * this adds a course picker that `AnnouncementsPanel` never needed. Admin sees every course;
 * an instructor sees only the ones they teach (`GET /courses?instructor_id=` already resolves to
 * exactly that for an instructor caller, per `CourseController::index()` — no backend change).
 */
export function AnnouncementComposer() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const { data: coursesPage } = useCourses(isAdmin ? {} : { instructor_id: user?.id });
    const courses = coursesPage?.data ?? [];

    const [courseId, setCourseId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);

    const effectiveCourseId = courseId ?? Number.NaN;
    const { data: announcements, isLoading } = useAnnouncements(effectiveCourseId);
    const createAnnouncement = useCreateAnnouncement(effectiveCourseId);
    const deleteAnnouncement = useDeleteAnnouncement(effectiveCourseId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await createAnnouncement.mutateAsync({ title, body });
            setTitle('');
            setBody('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not post this announcement.');
        }
    };

    return (
        <div className="flex flex-col gap-3 p-3">
            <div>
                <label htmlFor="announcement-course" className="text-xs font-medium text-ink-600">
                    Course
                </label>
                <select
                    id="announcement-course"
                    value={courseId ?? ''}
                    onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1 w-full rounded-md border border-surface-100 bg-surface-0 px-2 py-1.5 text-sm text-ink-900"
                >
                    <option value="">Select a course…</option>
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>
            </div>

            {courseId !== null && (
                <>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                        {error && <Alert variant="error" message={error} />}
                        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <Textarea label="Message" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required />
                        <Button type="submit" isLoading={createAnnouncement.isPending} className="self-start">
                            Post announcement
                        </Button>
                    </form>

                    <div className="flex flex-col gap-2 border-t border-surface-100 pt-3">
                        {isLoading && <Spinner />}

                        {!isLoading &&
                            (announcements ?? []).map((announcement) => (
                                <div key={announcement.id} className="flex items-start justify-between gap-2 rounded-md bg-surface-50 p-2">
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">{announcement.title}</p>
                                        <p className="text-xs text-ink-600">{new Date(announcement.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                                        aria-label={`Delete ${announcement.title}`}
                                        className="rounded-md p-1 text-ink-600 hover:bg-surface-100"
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}

                        {!isLoading && (announcements ?? []).length === 0 && (
                            <EmptyState icon={Megaphone} title="No announcements" description="Nothing posted for this course yet." />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
