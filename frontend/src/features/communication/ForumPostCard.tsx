import { useState } from 'react';
import { FileText, Lock, MessageCircle, MoreHorizontal, Pin, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { ApiError } from '@/lib/api/client';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { ForumComposer } from '@/features/communication/ForumComposer';
import {
    useDeleteForumPost,
    useForumThread,
    useReplyToForumThread,
    useReportForumPost,
    useUpdateForumPost,
    useUpdateForumThread,
} from '@/features/communication/useCommunication';
import type { ForumPost, ForumThread } from '@/lib/api/types';

function Attachment({ post }: { post: ForumPost }) {
    if (!post.attachment_type || post.attachment_type === 'article') {
        return null;
    }

    if (post.attachment_type === 'image' && post.attachment_url) {
        return <img src={post.attachment_url} alt="" className="mt-2 max-h-96 w-full rounded-md object-cover" />;
    }

    if (post.attachment_type === 'video' && post.attachment_url) {
        return <video src={post.attachment_url} controls className="mt-2 max-h-96 w-full rounded-md" />;
    }

    if (post.attachment_type === 'audio' && post.attachment_url) {
        return <audio src={post.attachment_url} controls className="mt-2 w-full" />;
    }

    return null;
}

function ReportForm({ postId, onDone }: { postId: number; onDone: () => void }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const report = useReportForumPost();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await report.mutateAsync({ postId, reason });
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit this report.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-md bg-surface-50 p-3">
            {error && <Alert variant="error" message={error} />}
            <Input label="Why are you reporting this post?" value={reason} onChange={(e) => setReason(e.target.value)} required />
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

function ReplySection({ thread, courseId }: { thread: ForumThread; courseId: number }) {
    const { user } = useAuth();
    const { data: fullThread, isLoading } = useForumThread(thread.id);
    const reply = useReplyToForumThread(courseId, thread.id);
    const deletePost = useDeleteForumPost(courseId, thread.id);
    const [body, setBody] = useState('');
    const isStaff = user?.role === 'admin' || user?.role === 'instructor';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) {
            return;
        }
        await reply.mutateAsync(body);
        setBody('');
    };

    return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-100 pt-3">
            {isLoading && <Spinner />}

            {(fullThread?.replies ?? []).map((post) => (
                <div key={post.id} className="flex items-start justify-between gap-2 rounded-md bg-surface-50 p-2">
                    <div>
                        <p className="text-xs font-medium text-ink-900">{post.user?.name}</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-900">{post.body}</p>
                        <p className="mt-0.5 text-xs text-ink-600">{formatRelativeTime(post.created_at)}</p>
                    </div>
                    {(isStaff || post.user?.id === user?.id) && (
                        <button
                            onClick={() => deletePost.mutate(post.id)}
                            aria-label="Delete reply"
                            className="shrink-0 text-xs text-ink-600 hover:text-danger-600"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ))}

            {thread.is_locked ? (
                <Alert variant="error" message="This thread is locked — no new replies." />
            ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <div className="flex-1">
                        <Input label="" placeholder="Write a reply" value={body} onChange={(e) => setBody(e.target.value)} />
                    </div>
                    <Button type="submit" isLoading={reply.isPending} className="px-3 py-2 text-sm">
                        Reply
                    </Button>
                </form>
            )}
        </div>
    );
}

export function ForumPostCard({ thread, courseId }: { thread: ForumThread; courseId: number }) {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    const updateThread = useUpdateForumThread(courseId, thread.id);
    const updatePost = useUpdateForumPost(courseId, thread.id);
    const deletePost = useDeleteForumPost(courseId, thread.id);

    const post = thread.post;
    const isStaff = user?.role === 'admin' || user?.role === 'instructor';
    const isOwnPost = post.user?.id === user?.id;

    if (isEditing) {
        return (
            <Card>
                <ForumComposer
                    initialBody={post.body}
                    initialAttachmentType={post.attachment_type}
                    existingAttachmentName={post.attachment_original_name}
                    submitLabel="Save"
                    onCancel={() => setIsEditing(false)}
                    isSubmitting={updatePost.isPending}
                    onSubmit={async (body, input) => {
                        await updatePost.mutateAsync({ postId: post.id, body, ...input });
                        setIsEditing(false);
                    }}
                />
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <Avatar name={post.user?.name ?? '?'} />
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-ink-900">{post.user?.name}</p>
                            {thread.is_pinned && <Pin className="size-3.5 text-blue-600" aria-hidden="true" />}
                        </div>
                        <p className="text-xs text-ink-600">{formatRelativeTime(post.created_at)}</p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        aria-label="Post options"
                        className="rounded-md p-1.5 text-ink-600 hover:bg-surface-100"
                    >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-surface-100 bg-surface-0 py-1 text-sm shadow-lg">
                            {isOwnPost && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-ink-900 hover:bg-surface-50"
                                >
                                    Edit
                                </button>
                            )}
                            {(isOwnPost || isStaff) && (
                                <button
                                    onClick={() => {
                                        deletePost.mutate(post.id);
                                        setIsMenuOpen(false);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-danger-600 hover:bg-surface-50"
                                >
                                    Delete
                                </button>
                            )}
                            {!isOwnPost && (
                                <button
                                    onClick={() => {
                                        setIsReporting(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-ink-900 hover:bg-surface-50"
                                >
                                    Report
                                </button>
                            )}
                            {isStaff && (
                                <>
                                    <button
                                        onClick={() => {
                                            updateThread.mutate({ is_pinned: !thread.is_pinned });
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-ink-900 hover:bg-surface-50"
                                    >
                                        <Pin className="size-3.5" aria-hidden="true" />
                                        {thread.is_pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateThread.mutate({ is_locked: !thread.is_locked });
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-ink-900 hover:bg-surface-50"
                                    >
                                        {thread.is_locked ? (
                                            <Unlock className="size-3.5" aria-hidden="true" />
                                        ) : (
                                            <Lock className="size-3.5" aria-hidden="true" />
                                        )}
                                        {thread.is_locked ? 'Unlock' : 'Lock'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {post.attachment_type === 'article' && <Badge label="Article" tone="neutral" icon={FileText} className="mt-2" />}
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-900">{post.body}</p>
            <Attachment post={post} />

            <div className="mt-3 flex items-center gap-3 border-t border-surface-100 pt-2">
                <button
                    onClick={() => setIsReplying((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-blue-600"
                >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Reply{thread.reply_count ? ` (${thread.reply_count})` : ''}
                </button>
            </div>

            {isReporting && <ReportForm postId={post.id} onDone={() => setIsReporting(false)} />}
            {isReplying && <ReplySection thread={thread} courseId={courseId} />}
        </Card>
    );
}
