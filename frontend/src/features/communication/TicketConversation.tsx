import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/auth/AuthContext';
import { useReplyToTicket, useUpdateTicket } from '@/features/communication/useCommunication';
import { ticketStatusDisplay } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { Ticket, TicketStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatDate';

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
    // No replies on a finished ticket; staff reopen it via the status control first.
    const isLocked = ticket.status === 'resolved' || ticket.status === 'closed';

    const submitReply = async () => {
        if (isLocked || !body.trim()) {
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
                    // "Mine" is the viewer's side of the conversation: the student's own messages
                    // for a student, every staff reply for staff. Mine → right + blue, theirs → left + grey.
                    const isMine = isStaff ? !isFromStudent : isFromStudent;

                    return (
                        <div key={message.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                            <div
                                className={cn(
                                    'max-w-[75%] rounded-lg px-3 py-2',
                                    isMine ? 'bg-blue-600 text-white' : 'bg-surface-100 text-ink-900',
                                )}
                            >
                                <p className={cn('text-xs font-semibold', isMine ? 'text-white/90' : 'text-ink-900')}>
                                    {message.sender?.name ?? (isFromStudent ? 'Student' : 'Support team')}
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm">{message.body}</p>
                                <p className={cn('mt-1 text-xs', isMine ? 'text-white/70' : 'text-ink-600')}>
                                    {formatDateTime(message.created_at)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Textarea
                            label="Reply"
                            rows={2}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLocked}
                            required
                        />
                    </div>
                    <Button type="submit" isLoading={reply.isPending} disabled={isLocked}>
                        <Send className="size-4" aria-hidden="true" />
                        Send
                    </Button>
                </div>
                {isLocked && (
                    <p className="text-xs text-ink-600">
                        This ticket is {ticketStatusDisplay(ticket.status).label.toLowerCase()}, so replies are turned off.{' '}
                        {isStaff ? 'Change its status above to reopen it.' : 'Open a new ticket if you still need help.'}
                    </p>
                )}
            </form>
        </div>
    );
}
