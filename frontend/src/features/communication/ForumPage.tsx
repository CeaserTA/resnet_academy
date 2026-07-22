import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { MessageCircle, Search, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useCreateForumThread, useForumThreads } from '@/features/communication/useCommunication';
import { ForumComposer } from '@/features/communication/ForumComposer';
import { ForumPostCard } from '@/features/communication/ForumPostCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import type { ForumPostAttachmentInput } from '@/features/communication/api';

type Tab = 'feed' | 'mine';

export function ForumPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('feed');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [composerError, setComposerError] = useState<string | null>(null);

    const { data: threads, isLoading } = useForumThreads(courseId, { search: search || undefined, mine: tab === 'mine' });
    const createThread = useCreateForumThread(courseId);

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';

    const handleCreate = async (body: string, input: ForumPostAttachmentInput) => {
        setComposerError(null);
        try {
            await createThread.mutateAsync({ body, ...input });
        } catch (err) {
            setComposerError(err instanceof ApiError ? err.message : 'Could not create this post.');
            throw err;
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Discussion forum</h1>
                {isStaff && (
                    <Link to={`/courses/${courseId}/forum/moderation`}>
                        <Button variant="secondary">
                            <ShieldAlert className="size-4" aria-hidden="true" />
                            Reports
                        </Button>
                    </Link>
                )}
            </div>

            <div className="mt-4 flex gap-1 border-b border-surface-100">
                {(
                    [
                        ['feed', 'Feed'],
                        ['mine', 'My Posts'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'border-b-2 px-3 py-2 text-sm font-medium',
                            tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-600',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setSearch(searchInput);
                }}
                className="mt-4 flex gap-2"
            >
                <Input
                    label=""
                    placeholder="Search posts"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="flex-1"
                />
                <Button type="submit" variant="secondary">
                    <Search className="size-4" aria-hidden="true" />
                </Button>
            </form>

            <div className="mt-4">
                {composerError && <Alert variant="error" message={composerError} className="mb-2" />}
                <ForumComposer onSubmit={handleCreate} isSubmitting={createThread.isPending} />
            </div>

            <div className="mt-6 flex flex-col gap-4">
                {isLoading && <Spinner />}

                {!isLoading && (threads ?? []).length === 0 && (
                    <EmptyState
                        icon={MessageCircle}
                        title={tab === 'mine' ? "You haven't posted yet" : 'No posts yet'}
                        description={tab === 'mine' ? 'Share something above.' : 'Start the first discussion.'}
                    />
                )}

                {(threads ?? []).map((thread) => (
                    <ForumPostCard key={thread.id} thread={thread} courseId={courseId} />
                ))}
            </div>
        </div>
    );
}
