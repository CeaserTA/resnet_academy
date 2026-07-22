import { useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * FR "Announcements" — course-scoped broadcast, embedded in the course player (student, read
 * only) and the course builder (instructor/admin, create/delete). Same component either way;
 * the role check just decides whether the composer/delete buttons render.
 */
export function AnnouncementsPanel({ courseId }: { courseId: number }) {
    const { user } = useAuth();
    const { data: announcements, isLoading } = useAnnouncements(courseId);
    const createAnnouncement = useCreateAnnouncement(courseId);
    const deleteAnnouncement = useDeleteAnnouncement(courseId);
    const canManage = user?.role === 'admin' || user?.role === 'instructor';

    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await createAnnouncement.mutateAsync({ title, body });
            setTitle('');
            setBody('');
            setIsCreating(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not post this announcement.');
        }
    };

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <h2 className="text-lg">Announcements</h2>
                {canManage && !isCreating && (
                    <Button variant="secondary" onClick={() => setIsCreating(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New announcement
                    </Button>
                )}
            </div>

            {isCreating && (
                <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 rounded-md border border-surface-100 bg-surface-50 p-4">
                    {error && <Alert variant="error" message={error} />}
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <Textarea label="Message" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required />
                    <div className="flex gap-2">
                        <Button type="submit" isLoading={createAnnouncement.isPending}>
                            Post
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            <div className="mt-3 flex flex-col gap-2">
                {(announcements ?? []).map((announcement) => (
                    <Card key={announcement.id}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-ink-900">{announcement.title}</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{announcement.body}</p>
                                <p className="mt-1 text-xs text-ink-600">
                                    {announcement.posted_by?.name} — {new Date(announcement.created_at).toLocaleString()}
                                </p>
                            </div>
                            {canManage && (
                                <Button
                                    variant="ghost"
                                    className="px-2 py-1"
                                    onClick={() => deleteAnnouncement.mutate(announcement.id)}
                                    aria-label={`Delete ${announcement.title}`}
                                >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}

                {(announcements ?? []).length === 0 && !isCreating && (
                    <EmptyState icon={Megaphone} title="No announcements" description="Nothing posted yet." />
                )}
            </div>
        </div>
    );
}
