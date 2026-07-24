import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, MessageSquare, Pin, Plus, Search, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ForumComposer } from '@/features/communication/ForumComposer';
import { DiscussionThread } from '@/features/communication/DiscussionThread';
import { useCreateForumThread, useForumTags, useForumThread, useForumThreads } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ForumPostAttachmentInput } from '@/features/communication/api';
import type { ForumSort, ForumThread } from '@/lib/api/types';

const SORT_OPTIONS: [ForumSort, string][] = [
    ['latest_activity', 'Latest activity'],
    ['newest', 'Newest'],
    ['most_replies', 'Most replies'],
];

function HighlightedText({ text, query }: { text: string; query: string }) {
    if (!query.trim()) {
        return <>{text}</>;
    }

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={index} className="rounded bg-amber-100 text-ink-900">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </>
    );
}

function relativeDateGroup(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today's discussions";
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function DiscussionListItem({
    thread,
    isSelected,
    onSelect,
    query,
}: {
    thread: ForumThread;
    isSelected: boolean;
    onSelect: () => void;
    query: string;
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                isSelected ? 'border-blue-600 bg-blue-600/5' : 'border-transparent hover:bg-surface-50',
            )}
        >
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-ink-600" aria-hidden="true" />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    {thread.unread && <span className="size-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                    <p className="truncate text-sm font-medium text-ink-900">
                        <HighlightedText text={thread.title} query={query} />
                    </p>
                    {thread.solved && <CheckCircle2 className="size-3.5 shrink-0 text-success-600" aria-hidden="true" />}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-600">
                    {thread.creator?.name}
                    {thread.tags && thread.tags.length > 0 && ` · ${thread.tags.map((tag) => tag.name).join(', ')}`}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                    {thread.reply_count ?? 0} {thread.reply_count === 1 ? 'reply' : 'replies'}
                    {thread.last_activity_at && ` · Last activity ${formatRelativeTime(thread.last_activity_at)}`}
                </p>
            </div>

            <div className="flex shrink-0 -space-x-2">
                {thread.creator && (
                    <Avatar name={thread.creator.name} src={thread.creator.avatar_url} size="sm" className="ring-2 ring-surface-0" />
                )}
                {thread.latest_participant && thread.latest_participant.id !== thread.creator?.id && (
                    <Avatar
                        name={thread.latest_participant.name}
                        src={thread.latest_participant.avatar_url}
                        size="sm"
                        className="ring-2 ring-surface-0"
                    />
                )}
            </div>
        </button>
    );
}

export function ForumPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'all' | 'mine'>('all');
    const [sort, setSort] = useState<ForumSort>('latest_activity');
    const [isComposing, setIsComposing] = useState(false);
    const [composerError, setComposerError] = useState<string | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(() => {
        const fromQuery = searchParams.get('thread');
        return fromQuery ? Number(fromQuery) : null;
    });

    useEffect(() => {
        const timeout = setTimeout(() => setSearch(searchInput), 300);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    const {
        data: threadPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useForumThreads(courseId, { search: search || undefined, mine: tab === 'mine', sort, tags: selectedTagIds });
    const { data: tags } = useForumTags();
    const createThread = useCreateForumThread(courseId);
    const { data: selectedThread } = useForumThread(selectedThreadId ?? NaN);

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    const threads = useMemo(() => threadPages?.pages.flatMap((page) => page.data) ?? [], [threadPages]);
    const pinnedThreads = threads.filter((thread) => thread.is_pinned);
    const groupedThreads = useMemo(() => {
        const groups = new Map<string, ForumThread[]>();
        for (const thread of threads.filter((thread) => !thread.is_pinned)) {
            const label = thread.last_activity_at ? relativeDateGroup(thread.last_activity_at) : 'Earlier';
            groups.set(label, [...(groups.get(label) ?? []), thread]);
        }
        return Array.from(groups.entries());
    }, [threads]);

    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasNextPage) {
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isFetchingNextPage) {
                fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const openThread = (threadId: number) => {
        setSelectedThreadId(threadId);
        setIsComposing(false);
    };

    const closeThread = () => {
        setSelectedThreadId(null);
        if (searchParams.has('thread')) {
            searchParams.delete('thread');
            setSearchParams(searchParams, { replace: true });
        }
    };

    const handleCreate = async (values: { title?: string; body: string; tags?: string[] } & ForumPostAttachmentInput) => {
        setComposerError(null);
        try {
            const created = await createThread.mutateAsync({ ...values, title: values.title ?? '' });
            setIsComposing(false);
            openThread(created.id);
        } catch (err) {
            setComposerError(err instanceof ApiError ? err.message : 'Could not create this discussion.');
            throw err;
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Course Forum</h1>
                {isStaff && (
                    <Link to={`/courses/${courseId}/forum/moderation`}>
                        <Button variant="secondary">
                            <ShieldAlert className="size-4" aria-hidden="true" />
                            Reports
                        </Button>
                    </Link>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                <div className={cn('flex flex-col gap-3', selectedThreadId ? 'hidden lg:flex lg:w-2/5' : 'w-full')}>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search discussions..."
                                aria-label="Search discussions"
                                className="w-full rounded-md border border-surface-100 bg-surface-0 py-2 pl-9 pr-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            />
                        </div>
                        <Button onClick={() => setIsComposing((prev) => !prev)}>
                            <Plus className="size-4" aria-hidden="true" />
                            New Discussion
                        </Button>
                    </div>

                    {isComposing && (
                        <div>
                            {composerError && <Alert variant="error" message={composerError} className="mb-2" />}
                            <ForumComposer
                                isNewDiscussion
                                onCancel={() => setIsComposing(false)}
                                onSubmit={handleCreate}
                                isSubmitting={createThread.isPending}
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1 border-b border-surface-100">
                            {(
                                [
                                    ['all', 'All discussions'],
                                    ['mine', 'My discussions'],
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

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as ForumSort)}
                            aria-label="Sort discussions"
                            className="rounded-md border border-surface-100 bg-surface-0 px-2 py-1 text-xs text-ink-900"
                        >
                            {SORT_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => {
                                const isSelected = selectedTagIds.includes(tag.id);

                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() =>
                                            setSelectedTagIds((prev) =>
                                                isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                                            )
                                        }
                                        aria-pressed={isSelected}
                                        className={cn(
                                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                            isSelected ? 'bg-blue-600 text-white' : 'bg-ink-300/20 text-ink-600 hover:bg-ink-300/30',
                                        )}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {isLoading && (
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        )}

                        {!isLoading && threads.length === 0 && (
                            <EmptyState
                                icon={MessageSquare}
                                title={tab === 'mine' ? "You haven't started a discussion yet" : 'No discussions yet'}
                                description={tab === 'mine' ? 'Start one above.' : 'Be the first to start a discussion.'}
                            />
                        )}

                        {pinnedThreads.length > 0 && (
                            <div>
                                <p className="flex items-center gap-1 px-1 text-xs font-medium uppercase tracking-wide text-ink-600">
                                    <Pin className="size-3" aria-hidden="true" />
                                    Pinned discussions
                                </p>
                                <div className="mt-1 flex flex-col gap-1">
                                    {pinnedThreads.map((thread) => (
                                        <DiscussionListItem
                                            key={thread.id}
                                            thread={thread}
                                            isSelected={thread.id === selectedThreadId}
                                            onSelect={() => openThread(thread.id)}
                                            query={search}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {groupedThreads.map(([label, items]) => (
                            <div key={label}>
                                <p className="px-1 text-xs font-medium uppercase tracking-wide text-ink-600">{label}</p>
                                <div className="mt-1 flex flex-col gap-1">
                                    {items.map((thread) => (
                                        <DiscussionListItem
                                            key={thread.id}
                                            thread={thread}
                                            isSelected={thread.id === selectedThreadId}
                                            onSelect={() => openThread(thread.id)}
                                            query={search}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div ref={sentinelRef} />
                        {isFetchingNextPage && <Spinner />}
                    </div>
                </div>

                {selectedThreadId && (
                    <div className="flex w-full flex-col rounded-lg border border-surface-100 bg-surface-0 p-4 lg:w-3/5">
                        <div className="mb-2 flex justify-end">
                            <Button variant="ghost" className="px-2 py-1" onClick={closeThread} aria-label="Back to discussions">
                                <X className="size-4" aria-hidden="true" />
                            </Button>
                        </div>
                        {!selectedThread ? (
                            <Spinner />
                        ) : (
                            <DiscussionThread thread={selectedThread} courseId={courseId} onClosed={closeThread} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
