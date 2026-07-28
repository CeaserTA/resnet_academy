import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/auth/AuthContext';
import { useReplyToTicket, useUpdateTicket } from '@/features/communication/useCommunication';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { Ticket, TicketStatus } from '@/lib/api/types';

const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

/**
 * The message thread + reply composer, shared by the staff side panel and the student modal
 * (`TicketsPage.tsx`) — one implementation of "view and respond," not two. `ticket` is already
 * loaded by the caller so each container can put the real subject/status in its own header.
 */
export function TicketConversation({ ticket }: { ticket: Ticket }) {
    const { user } = useAuth();
    const reply = useReplyToTicket(ticket.id);
    const updateTicket = useUpdateTicket(ticket.id);
    const [body, setBody] = useState('');

    const isStaff = user?.role === 'admin' || user?.role === 'instructor';

    const submitReply = async () => {
        if (!body.trim()) {
            return;
        }
        await reply.mutateAsync(body);
        setBody('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void submitReply();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submitReply();
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {isStaff && (
                <Card className="flex flex-wrap items-center gap-3">
                    <Select
                        label="Status"
                        labelClassName="sr-only"
                        value={ticket.status}
                        onChange={(e) => updateTicket.mutate({ status: e.target.value })}
                        className="max-w-xs"
                    >
                        {statusOptions.map((option) => (
                            <option key={option} value={option}>
                                {ticketStatusDisplay(option).label}
                            </option>
                        ))}
                    </Select>
                    {!ticket.assigned_to && (
                        <Button variant="secondary" onClick={() => user && updateTicket.mutate({ assigned_to: user.id })}>
                            Assign to me
                        </Button>
                    )}
                    {ticket.assigned_to && <p className="text-sm text-ink-600">Assigned to {ticket.assigned_to.name}</p>}
                </Card>
            )}

            <div className="flex flex-col gap-2">
                {ticket.messages.map((message) => {
                    // Role-based, not "am I the one who typed this": any staff reply (whichever
                    // admin/instructor sent it) is styled the same way, distinct from the ticket's
                    // own student — otherwise a staff reply from a colleague other than whoever is
                    // currently viewing would incorrectly render as an incoming student message.
                    const isFromStudent = message.sender?.id === ticket.student?.id;

                    return (
                        <div key={message.id} className={cn('flex', isFromStudent ? 'justify-start' : 'justify-end')}>
                            <div
                                className={cn(
                                    'max-w-[75%] rounded-lg px-3 py-2',
                                    isFromStudent ? 'bg-surface-100 text-ink-900' : 'bg-blue-600 text-white',
                                )}
                            >
                                {isFromStudent && <p className="text-sm font-medium text-ink-900">{message.sender?.name}</p>}
                                <p className={cn('text-sm', isFromStudent && 'mt-1')}>{message.body}</p>
                                <p className={cn('mt-1 text-xs', isFromStudent ? 'text-ink-600' : 'text-white/70')}>
                                    {new Date(message.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-1">
                    <Textarea
                        label="Reply"
                        rows={2}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={handleKeyDown}
                        required
                    />
                </div>
                <Button type="submit" variant="ghost" isLoading={reply.isPending} className="px-2 py-2" aria-label="Send reply">
                    <Send className="size-5" aria-hidden="true" />
                </Button>
            </form>
        </div>
    );
}
