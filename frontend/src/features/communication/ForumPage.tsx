import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, MessageSquare, Pin, Plus, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ForumComposer } from '@/features/communication/ForumComposer';
import { DiscussionThread } from '@/features/communication/DiscussionThread';
import { useCreateForumThread, useForumTags, useForumThread, useForumThreads } from '@/features/communication/useCommunication';
import { useCourse } from '@/features/catalogue/useCourses';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ForumPostAttachmentInput } from '@/features/communication/api';
import type { ForumSort, ForumThread } from '@/lib/api/types';
import { formatDate } from '@/lib/formatDate';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';

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
    return formatDate(date);
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
            aria-current={isSelected ? 'true' : undefined}
            className={cn(
                'flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors',
                isSelected ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-surface-50',
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

            {/* Creator + latest participant, side by side so both sets of initials show in full */}
            <div className="flex shrink-0 gap-1">
                {thread.creator && (
                    <Avatar name={thread.creator.name} src={thread.creator.avatar_url} size="sm" className="size-7 text-xs ring-2 ring-surface-0" />
                )}
                {thread.latest_participant && thread.latest_participant.id !== thread.creator?.id && (
                    <Avatar
                        name={thread.latest_participant.name}
                        src={thread.latest_participant.avatar_url}
                        size="sm"
                        className="size-7 text-xs ring-2 ring-surface-0"
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
    const { data: course } = useCourse(courseId);
    usePageHeader(course ? `${course.title} forum` : 'Forum', 'Ask questions and discuss the course with classmates and instructors');
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <Breadcrumbs
                        items={[
                            isStaff ? { label: 'Courses', to: '/admin/courses' } : { label: 'My courses', to: '/dashboard' },
                            { label: course?.title ?? 'Course', to: isStaff ? `/admin/courses/${courseId}/modules` : `/learn/courses/${courseId}` },
                            { label: 'Forum' },
                        ]}
                    />
                </div>
                {isStaff && (
                    <Link to={`/courses/${courseId}/forum/moderation`}>
                        <Button variant="secondary">
                            <ShieldAlert className="size-4" aria-hidden="true" />
                            Reports
                        </Button>
                    </Link>
                )}
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row">
                <div className={cn('flex flex-col gap-3', selectedThreadId ? 'hidden lg:flex lg:w-2/5' : 'w-full')}>
                    <div className="flex gap-2">
                        <SearchInput
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder="Search discussions…"
                            className="ml-0 max-w-none flex-1 self-center"
                        />
                        <Button onClick={() => setIsComposing((prev) => !prev)}>
                            <Plus className="size-4" aria-hidden="true" />
                            New discussion
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
                        <SegmentedTabs
                            label="Discussion filter"
                            value={tab}
                            onChange={setTab}
                            tabs={[
                                { value: 'all', label: 'All discussions' },
                                { value: 'mine', label: 'My discussions' },
                            ]}
                        />

                        <div className="w-44">
                            <Select
                                label="Sort discussions"
                                labelClassName="sr-only"
                                value={sort}
                                onChange={(e) => setSort(e.target.value as ForumSort)}
                                options={SORT_OPTIONS.map(([value, label]) => ({ value, label }))}
                                className="h-8 py-1 text-xs"
                            />
                        </div>
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

                        {threads.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        {pinnedThreads.length > 0 && (
                            <div>
                                <p className="flex items-center gap-1 border-b border-surface-100 bg-surface-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-600">
                                    <Pin className="size-3" aria-hidden="true" />
                                    Pinned discussions
                                </p>
                                <div className="flex flex-col divide-y divide-surface-100">
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
                                <p className="border-y border-surface-100 bg-surface-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-600">{label}</p>
                                <div className="flex flex-col divide-y divide-surface-100">
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
                        </div>
                        )}

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
