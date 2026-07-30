import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MessageSquare, Plus, Search, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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

    return (
        <button
            onClick={onSelect}
            className={cn(
                'flex w-full items-center gap-3 border-b border-surface-100 px-4 py-3 text-left transition-colors hover:bg-surface-50',
                isActive && 'bg-blue-600/5',
            )}
        >
            <Avatar name={others[0]?.name ?? name} src={others[0]?.avatar_url} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink-900">{name}</p>
                    {conversation.last_message && (
                        <span className="shrink-0 text-xs text-ink-600">
                            {formatRelativeTime(conversation.last_message.sent_at)}
                        </span>
                    )}
                </div>
                <p className="truncate text-xs text-ink-600">
                    {conversation.last_message?.body ?? conversation.subject ?? 'No messages yet'}
                </p>
            </div>
            {unread > 0 && <Badge label={String(unread)} tone="progress" className="shrink-0" />}
        </button>
    );
}

function ConversationThread({ conversationId }: { conversationId: number }) {
    const { user } = useAuth();
    const { data: conversation, isLoading } = useConversation(conversationId);
    const sendMessage = useSendMessage(conversationId);
    const [body, setBody] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) {
            return;
        }
        await sendMessage.mutateAsync(body);
        setBody('');
    };

    if (isLoading || !conversation) {
        return (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-surface-100 bg-surface-0">
                <Spinner />
            </div>
        );
    }

    const others = otherParticipants(conversation, user?.id);
    const name = others.map((p) => p.name).join(', ') || 'Conversation';

    return (
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-surface-100 bg-surface-0">
            <div className="flex items-center gap-3 border-b border-surface-100 px-4 py-3">
                <Avatar name={others[0]?.name ?? name} src={others[0]?.avatar_url} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{name}</p>
                    {conversation.subject && <p className="truncate text-xs text-ink-600">{conversation.subject}</p>}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                {conversation.messages.map((message) => {
                    const isMine = message.sender?.id === user?.id;

                    return (
                        <div key={message.id} className={cn('flex max-w-[75%] flex-col gap-1', isMine ? 'self-end items-end' : 'self-start')}>
                            <div className={cn('rounded-lg px-3 py-2 text-sm', isMine ? 'bg-blue-600 text-white' : 'bg-surface-100 text-ink-900')}>
                                {message.body}
                            </div>
                            <p className="text-xs text-ink-600">
                                {!isMine && message.sender && <>{message.sender.name}, </>}
                                {formatRelativeTime(message.sent_at)}
                                {isMine && (message.read_at ? ' · Read' : ' · Sent')}
                            </p>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-surface-100 px-4 py-3">
                <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type a message"
                    aria-label="Message"
                    className="flex-1 rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                />
                <Button type="submit" isLoading={sendMessage.isPending} disabled={!body.trim()} aria-label="Send">
                    <Send className="size-4" aria-hidden="true" />
                </Button>
            </form>
        </div>
    );
}

/**
 * Chats-list-on-the-left, active-conversation-on-the-right split view (one screen, no full-page
 * navigation between browsing chats and reading one) instead of the previous two separate routes
 * (a list-only page, then a full-page reload into a single conversation). `/messages` and
 * `/messages/:id` both render this component — selecting a chat just updates the URL param, the
 * left list stays mounted throughout.
 */
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
        if (!term) {
            return conversations ?? [];
        }
        return (conversations ?? []).filter((conversation) => {
            const name = otherParticipants(conversation, user?.id)
                .map((p) => p.name)
                .join(' ')
                .toLowerCase();
            return name.includes(term) || (conversation.subject ?? '').toLowerCase().includes(term);
        });
    }, [conversations, search, user?.id]);

    return (
        <div className="flex h-full gap-4">
            <div className="flex w-full max-w-xs flex-col overflow-hidden rounded-lg border border-surface-100 bg-surface-0 sm:max-w-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <h1 className="text-xl font-semibold text-ink-900">Chats</h1>
                    <Button variant="ghost" className="px-2 py-1" onClick={() => setIsComposing(true)} aria-label="New message">
                        <Plus className="size-4" aria-hidden="true" />
                    </Button>
                </div>

                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            aria-label="Search chats"
                            className="w-full rounded-md border border-surface-100 bg-surface-50 py-2 pl-9 pr-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && <Spinner className="mt-6" />}

                    {!isLoading && filteredConversations.length === 0 && (
                        <EmptyState
                            icon={MessageSquare}
                            title={conversations?.length === 0 ? 'No messages yet' : 'No chats match this search'}
                            description={conversations?.length === 0 ? 'Start a new conversation above.' : 'Try a different search term.'}
                            className="mx-4 mt-6"
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

            {Number.isFinite(conversationId) ? (
                <ConversationThread conversationId={conversationId} />
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-surface-100 bg-surface-0">
                    <EmptyState
                        icon={MessageSquare}
                        title="Select a conversation"
                        description="Choose a chat from the list, or start a new one."
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
