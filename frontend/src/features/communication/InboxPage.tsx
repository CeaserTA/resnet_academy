import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MessageSquare, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComposeMessageForm } from '@/features/communication/ComposeMessageForm';
import { useConversations } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';

export function InboxPage() {
    const { user } = useAuth();
    const { data: conversations, isLoading } = useConversations();
    const [isComposing, setIsComposing] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Messages</h1>
                {!isComposing && (
                    <Button onClick={() => setIsComposing(true)}>
                        <Plus className="size-4" aria-hidden="true" />
                        New message
                    </Button>
                )}
            </div>

            {isComposing && (
                <div className="mt-4">
                    <ComposeMessageForm
                        onSent={(conversationId) => navigate(`/messages/${conversationId}`)}
                        onCancel={() => setIsComposing(false)}
                    />
                </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
                {isLoading && <Spinner />}

                {!isLoading && (conversations ?? []).length === 0 && (
                    <EmptyState icon={MessageSquare} title="No messages yet" description="Start a new conversation above." />
                )}

                {(conversations ?? []).map((conversation) => {
                    const otherParticipants = conversation.participants.filter((p) => p.id !== user?.id);
                    const unread = conversation.unread_count ?? 0;

                    return (
                        <Link key={conversation.id} to={`/messages/${conversation.id}`}>
                            <Card className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-ink-900">
                                        {otherParticipants.map((p) => p.name).join(', ') || 'Conversation'}
                                    </p>
                                    {conversation.subject && (
                                        <p className="text-sm text-ink-600">{conversation.subject}</p>
                                    )}
                                    {conversation.last_message && (
                                        <p className="mt-1 truncate text-sm text-ink-600">
                                            {conversation.last_message.body}
                                        </p>
                                    )}
                                </div>
                                {unread > 0 && <Badge label={`${unread} new`} tone="progress" />}
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
