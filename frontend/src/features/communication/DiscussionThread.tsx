import { useEffect, useRef, useState } from 'react';
import {
    CheckCircle2,
    Flag,
    Link as LinkIcon,
    Lock,
    MoreHorizontal,
    Pencil,
    Pin,
    Send,
    Trash2,
    Unlock,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ForumComposer } from '@/features/communication/ForumComposer';
import {
    useDeleteForumPost,
    useForumReplies,
    useReplyToForumThread,
    useReportForumPost,
    useUpdateForumPost,
    useUpdateForumThread,
} from '@/features/communication/useCommunication';
import { MarkdownContent } from '@/lib/markdown/MarkdownContent';
import { MarkdownComposer } from '@/lib/markdown/MarkdownComposer';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatRelativeTime } from '@/lib/utils';
import type { ForumPost, ForumThread } from '@/lib/api/types';

function Attachment({ post }: { post: ForumPost }) {
    if (!post.attachment_type || post.attachment_type === 'article' || !post.attachment_url) {
        return null;
    }

    if (post.attachment_type === 'image') {
        return <img src={post.attachment_url} alt="" className="mt-2 max-h-96 w-full rounded-md object-cover" />;
    }
    if (post.attachment_type === 'video') {
        return <video src={post.attachment_url} controls className="mt-2 max-h-96 w-full rounded-md" />;
    }
    return <audio src={post.attachment_url} controls className="mt-2 w-full" />;
}

function ReportForm({ postId, onDone }: { postId: number; onDone: () => void }) {
    const [reason, setReason] = useState('');
    const report = useReportForumPost();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await report.mutateAsync({ postId, reason });
        onDone();
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-md bg-surface-50 p-3">
            <Input label="Why are you reporting this?" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <div className="flex gap-2">
                <Button type="submit" isLoading={report.isPending} className="px-3 py-1 text-xs">
                    Submit report
                </Button>
                <Button type="button" variant="ghost" onClick={onDone} className="px-3 py-1 text-xs">
                    Cancel
                </Button>
            </div>
        </form>
    );
}

interface MessageRowProps {
    post: ForumPost;
    isHead?: boolean;
    courseId: number;
    threadId: number;
}

function MessageRow({ post, isHead, courseId, threadId }: MessageRowProps) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const updatePost = useUpdateForumPost(courseId, threadId);
    const deletePost = useDeleteForumPost(courseId, threadId);

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    const isOwn = post.user?.id === user?.id;

    if (isEditing) {
        return (
            <div className="rounded-lg border border-surface-100 p-3">
                <ForumComposer
                    initialBody={post.body}
                    initialAttachmentType={post.attachment_type}
                    existingAttachmentName={post.attachment_original_name}
                    submitLabel="Save"
                    onCancel={() => setIsEditing(false)}
                    isSubmitting={updatePost.isPending}
                    onSubmit={async (values) => {
                        await updatePost.mutateAsync({ postId: post.id, ...values });
                        setIsEditing(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`group flex gap-3 rounded-lg p-2 ${isOwn ? 'bg-blue-600/5' : ''}`}>
            <Avatar name={post.user?.name ?? '?'} src={post.user?.avatar_url} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">{post.user?.name}</p>
                        {isHead && <Badge label="Original post" tone="progress" />}
                        <p className="text-xs text-ink-600">{formatRelativeTime(post.created_at)}</p>
                        {post.edited && <p className="text-xs text-ink-600">(edited)</p>}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <DropdownMenu
                            align="right"
                            trigger={(toggle) => (
                                <button onClick={toggle} aria-label="Message actions" className="rounded-md p-1 text-ink-600 hover:bg-surface-100">
                                    <MoreHorizontal className="size-4" aria-hidden="true" />
                                </button>
                            )}
                            items={[
                                ...(isOwn ? [{ label: 'Edit', icon: Pencil, onClick: () => setIsEditing(true) }] : []),
                                ...(isOwn || isStaff
                                    ? [
                                          {
                                              label: 'Delete',
                                              icon: Trash2,
                                              variant: 'danger' as const,
                                              onClick: () => deletePost.mutate(post.id),
                                          },
                                      ]
                                    : []),
                                {
                                    label: 'Copy link',
                                    icon: LinkIcon,
                                    onClick: () =>
                                        navigator.clipboard.writeText(`${window.location.origin}/courses/${courseId}/forum?thread=${threadId}`),
                                },
                                ...(!isOwn ? [{ label: 'Report', icon: Flag, onClick: () => setIsReporting(true) }] : []),
                            ]}
                        />
                    </div>
                </div>

                {post.attachment_type === 'article' && <Badge label="Article" tone="neutral" className="mt-1" />}
                <MarkdownContent className="mt-1">{post.body}</MarkdownContent>
                <Attachment post={post} />

                {isReporting && <ReportForm postId={post.id} onDone={() => setIsReporting(false)} />}
            </div>
        </div>
    );
}

export function DiscussionThread({ thread, courseId, onClosed }: { thread: ForumThread; courseId: number; onClosed: () => void }) {
    const { user } = useAuth();
    const { data: repliesPages, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useForumReplies(thread.id);
    const reply = useReplyToForumThread(courseId, thread.id);
    const updateThread = useUpdateForumThread(courseId, thread.id);
    const deleteHeadPost = useDeleteForumPost(courseId, thread.id);
    const [body, setBody] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    const replies = repliesPages?.pages.flatMap((page) => page.data) ?? [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [thread.id]);

    const submitReply = async () => {
        if (!body.trim()) {
            return;
        }
        await reply.mutateAsync(body);
        setBody('');
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submitReply();
        }
    };

    const handleDeleteDiscussion = async () => {
        await deleteHeadPost.mutateAsync(thread.post.id);
        onClosed();
    };

    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2 border-b border-surface-100 pb-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg text-ink-900">{thread.title}</h2>
                        {thread.is_pinned && <Badge label="Pinned" tone="progress" icon={Pin} />}
                        {thread.solved && <Badge label="Solved" tone="success" icon={CheckCircle2} />}
                        {thread.is_locked && <Badge label="Locked" tone="neutral" icon={Lock} />}
                    </div>
                    {thread.tags && thread.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {thread.tags.map((tag) => (
                                <Badge key={tag.id} label={tag.name} tone="neutral" />
                            ))}
                        </div>
                    )}
                </div>

                {isStaff && (
                    <DropdownMenu
                        align="right"
                        trigger={(toggle) => (
                            <Button variant="ghost" className="px-2 py-1" onClick={toggle} aria-label="Discussion actions">
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                        )}
                        items={[
                            {
                                label: thread.is_pinned ? 'Unpin' : 'Pin',
                                icon: Pin,
                                onClick: () => updateThread.mutate({ is_pinned: !thread.is_pinned }),
                            },
                            {
                                label: thread.is_locked ? 'Unlock' : 'Lock',
                                icon: thread.is_locked ? Unlock : Lock,
                                onClick: () => updateThread.mutate({ is_locked: !thread.is_locked }),
                            },
                            ...(!thread.solved
                                ? [{ label: 'Mark solved', icon: CheckCircle2, onClick: () => updateThread.mutate({ solved: true }) }]
                                : []),
                            { label: 'Delete discussion', icon: Trash2, variant: 'danger' as const, onClick: () => void handleDeleteDiscussion() },
                        ]}
                    />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                <MessageRow post={thread.post} isHead courseId={courseId} threadId={thread.id} />

                {hasNextPage && (
                    <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                        className="mx-auto my-2 px-3 py-1 text-xs"
                    >
                        Load earlier replies
                    </Button>
                )}

                {isLoading && <Spinner className="mt-2" />}

                {replies.map((post) => (
                    <MessageRow key={post.id} post={post} courseId={courseId} threadId={thread.id} />
                ))}

                <div ref={bottomRef} />
            </div>

            {thread.is_locked ? (
                <Alert variant="error" message="This discussion is locked — no new replies." />
            ) : (
                <div className="flex items-end gap-2 border-t border-surface-100 pt-3">
                    <div className="flex-1">
                        <MarkdownComposer value={body} onChange={setBody} onKeyDown={handleKeyDown} placeholder="Reply..." rows={2} />
                    </div>
                    <Button onClick={() => void submitReply()} isLoading={reply.isPending} variant="ghost" className="px-2 py-2" aria-label="Send reply">
                        <Send className="size-5" aria-hidden="true" />
                    </Button>
                </div>
            )}
        </div>
    );
}
