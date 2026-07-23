import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { useConversation, useSendMessage } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

export function ConversationPage() {
    const { id } = useParams();
    const conversationId = Number(id);
    const { user } = useAuth();
    const { data: conversation, isLoading } = useConversation(conversationId);
    const sendMessage = useSendMessage(conversationId);
    const [body, setBody] = useState('');

    if (isLoading || !conversation) {
        return <Spinner />;
    }

    const otherParticipants = conversation.participants.filter((p) => p.id !== user?.id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) {
            return;
        }
        await sendMessage.mutateAsync(body);
        setBody('');
    };

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <Link to="/messages" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to messages
            </Link>

            <div>
                <h1 className="text-2xl">{otherParticipants.map((p) => p.name).join(', ')}</h1>
                {conversation.subject && <p className="text-sm text-ink-600">{conversation.subject}</p>}
            </div>

            <div className="flex flex-col gap-2">
                {conversation.messages.map((message) => {
                    const isMine = message.sender?.id === user?.id;

                    return (
                        <Card
                            key={message.id}
                            className={cn('max-w-[80%]', isMine ? 'self-end bg-blue-600/5' : 'self-start')}
                        >
                            <p className="text-sm text-ink-900">{message.body}</p>
                            <p className="mt-1 text-xs text-ink-600">
                                {new Date(message.sent_at).toLocaleString()}
                                {isMine && (message.read_at ? ' · Read' : ' · Sent')}
                            </p>
                        </Card>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <Textarea
                    label="Reply"
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                />
                <Button type="submit" isLoading={sendMessage.isPending} className="self-start">
                    Send
                </Button>
            </form>
        </div>
    );
}
