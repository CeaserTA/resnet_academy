import { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MessageSquare, Plus, Search, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComposeMessageForm } from '@/features/communication/ComposeMessageForm';
import { useConversation, useConversations, useSendMessage } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Conversation } from '@/lib/api/types';

function otherParticipants(conversation: Conversation, currentUserId: number | undefined) {
    return conversation.participants.filter((p) => p.id !== currentUserId);
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ChatListItem({
    conversation,
    isActive,
    currentUserId,
    onSelect,
}: {
    conversation: Conversation;
    isActive: boolean;
    currentUserId: number | undefined;
    onSelect: () => void;
}) {
    const others = otherParticipants(conversation, currentUserId);
    const name = others.map((p) => p.name).join(', ') || 'Conversation';
    const unread = conversation.unread_count ?? 0;
    const preview = conversation.last_message?.body ?? conversation.subject ?? 'No messages yet';

    return (
        <button
            onClick={onSelect}
            className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-50 rounded-lg',
                isActive && 'bg-blue-600/8',
            )}
        >
            <div className="relative shrink-0">
                <Avatar name={others[0]?.name ?? name} src={others[0]?.avatar_url} size="sm" className="size-9" />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                    <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold text-ink-900' : 'font-medium text-ink-900')}>
                        {name}
                    </p>
                    {conversation.last_message && (
                        <span className="shrink-0 text-[10px] text-ink-400">
                            {formatRelativeTime(conversation.last_message.sent_at)}
                        </span>
                    )}
                </div>
                <p className={cn('truncate text-xs', unread > 0 ? 'text-ink-600' : 'text-ink-400')}>
                    {preview}
                </p>
            </div>
        </button>
    );
}

// ─── Conversation thread ──────────────────────────────────────────────────────

function ConversationThread({ conversationId }: { conversationId: number }) {
    const { user } = useAuth();
    const { data: conversation, isLoading } = useConversation(conversationId);
    const sendMessage = useSendMessage(conversationId);
    const [body, setBody] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        await sendMessage.mutateAsync(body);
        setBody('');
    };

    if (isLoading || !conversation) {
        return (
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                <Spinner />
            </div>
        );
    }

    const others = otherParticipants(conversation, user?.id);
    const name = others.map((p) => p.name).join(', ') || 'Conversation';

    return (
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            {/* Thread header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
                <Avatar name={others[0]?.name ?? name} src={others[0]?.avatar_url} size="sm" className="size-8" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
                    {conversation.subject && (
                        <p className="truncate text-xs text-ink-400">{conversation.subject}</p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                {conversation.messages.length === 0 && (
                    <p className="text-center text-xs text-ink-400">No messages yet. Say something!</p>
                )}
                {conversation.messages.map((message) => {
                    const isMine = message.sender?.id === user?.id;
                    return (
                        <div
                            key={message.id}
                            className={cn('flex max-w-[72%] flex-col gap-1', isMine ? 'self-end items-end' : 'self-start items-start')}
                        >
                            {!isMine && (
                                <p className="ml-1 text-[10px] font-medium text-ink-400">{message.sender?.name}</p>
                            )}
                            <div
                                className={cn(
                                    'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                                    isMine
                                        ? 'rounded-tr-sm bg-blue-600 text-white'
                                        : 'rounded-tl-sm bg-surface-100 text-ink-900',
                                )}
                            >
                                {message.body}
                            </div>
                            <p className="mx-1 text-[10px] text-ink-400">
                                {formatRelativeTime(message.sent_at)}
                                {isMine && (message.read_at ? ' · Read' : ' · Sent')}
                            </p>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Compose bar */}
            <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-center gap-2 border-t border-surface-100 bg-surface-50 px-3 py-2.5"
            >
                <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="Message"
                    className="flex-1 rounded-full border border-surface-100 bg-surface-0 px-4 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                />
                <button
                    type="submit"
                    disabled={!body.trim() || sendMessage.isPending}
                    aria-label="Send"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                    <Send className="size-4" aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MessagesPage() {
    const { id } = useParams();
    const conversationId = Number(id);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: conversations, isLoading } = useConversations();
    const [isComposing, setIsComposing] = useState(false);
    const [search, setSearch] = useState('');

    const filteredConversations = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return conversations ?? [];
        return (conversations ?? []).filter((c) => {
            const name = otherParticipants(c, user?.id).map((p) => p.name).join(' ').toLowerCase();
            return name.includes(term) || (c.subject ?? '').toLowerCase().includes(term);
        });
    }, [conversations, search, user?.id]);

    const totalUnread = (conversations ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

    return (
        <div className="flex h-full gap-3">

            {/* ── Conversation list ─────────────────────────────────────── */}
            <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">

                {/* List header */}
                <div className="flex shrink-0 items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-semibold text-ink-900">Messages</h1>
                        {totalUnread > 0 && (
                            <Badge label={String(totalUnread)} tone="progress" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsComposing(true)}
                        aria-label="New message"
                        className="flex size-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-surface-100 hover:text-ink-900"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Search */}
                <div className="shrink-0 px-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search messages…"
                            aria-label="Search conversations"
                            className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-xs text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-1.5 pb-2">
                    {isLoading && <Spinner className="mt-6" />}

                    {!isLoading && filteredConversations.length === 0 && (
                        <EmptyState
                            icon={MessageSquare}
                            title={conversations?.length === 0 ? 'No messages yet' : 'No results'}
                            description={
                                conversations?.length === 0
                                    ? 'Start a new conversation.'
                                    : 'Try a different search.'
                            }
                            className="mt-6"
                        />
                    )}

                    {filteredConversations.map((conversation) => (
                        <ChatListItem
                            key={conversation.id}
                            conversation={conversation}
                            isActive={conversation.id === conversationId}
                            currentUserId={user?.id}
                            onSelect={() => navigate(`/messages/${conversation.id}`)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Thread panel ─────────────────────────────────────────── */}
            {Number.isFinite(conversationId) ? (
                <ConversationThread conversationId={conversationId} />
            ) : (
                <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    <EmptyState
                        icon={MessageSquare}
                        title="No conversation selected"
                        description="Pick a chat from the list or start a new one."
                    />
                </div>
            )}

            <Modal isOpen={isComposing} onClose={() => setIsComposing(false)} title="New message">
                <ComposeMessageForm
                    onSent={(sentConversationId) => {
                        setIsComposing(false);
                        navigate(`/messages/${sentConversationId}`);
                    }}
                    onCancel={() => setIsComposing(false)}
                />
            </Modal>
        </div>
    );
}
